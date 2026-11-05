import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { gunzipSync } from "node:zlib";
import { Controller, Get, type INestApplication, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Ce que le filtre global envoie VRAIMENT à Sentry : le SDK pointé sur un faux point
// d'ingestion local (skill error-tracking §9), qui garde les enveloppes reçues.
const recues: string[] = [];
let ingestion: Server;
let app: INestApplication;
let base: string;
let flush: (timeout?: number) => Promise<boolean>;

@Controller("essai")
class EssaiController {
  @Get("panne")
  panne(): never {
    throw new Error("échec pour parent@exemple.fr");
  }

  @Get("absent")
  absent(): never {
    throw new NotFoundException();
  }
}

beforeAll(async () => {
  ingestion = createServer((req, res) => {
    const morceaux: Buffer[] = [];
    req.on("data", (m: Buffer) => morceaux.push(m));
    req.on("end", () => {
      const corps = Buffer.concat(morceaux);
      const gz = req.headers["content-encoding"] === "gzip";
      recues.push((gz ? gunzipSync(corps) : corps).toString("utf8"));
      res.writeHead(200).end("{}");
    });
  });
  await new Promise<void>((ok) => ingestion.listen(0, "127.0.0.1", ok));
  const { port } = ingestion.address() as AddressInfo;
  process.env["SENTRY_DSN"] = `http://cle@127.0.0.1:${port}/1`;
  process.env["APP_ENV"] = "preprod";
  process.env["RELEASE"] = "sha-e2e";

  // Dans l'ordre de main.ts : Sentry d'abord, Nest ensuite.
  await import("../src/instrument");
  ({ flush } = await import("@nutrion/sentry"));
  const { AppModule } = await import("../src/app.module");
  const { HttpExceptionFilter } = await import("../src/common/http-exception.filter");

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
    controllers: [EssaiController],
  }).compile();
  app = moduleRef.createNestApplication({ logger: false });
  app.setGlobalPrefix("v1");
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(0, "127.0.0.1");
  base = await app.getUrl();
});

afterAll(async () => {
  await app?.close();
  await new Promise((ok) => ingestion?.close(ok));
});

/** Les événements d'erreur reçus (une enveloppe = en-tête, puis paires en-tête d'item / item). */
function evenements(): Array<Record<string, unknown>> {
  return recues.flatMap((enveloppe) => {
    const lignes = enveloppe.split("\n").filter(Boolean);
    const items: Array<Record<string, unknown>> = [];
    for (let i = 1; i < lignes.length - 1; i += 2) {
      const entete = JSON.parse(lignes[i] ?? "{}") as { type?: string };
      if (entete.type === "event") items.push(JSON.parse(lignes[i + 1] ?? "{}"));
    }
    return items;
  });
}

describe("filtre d'exception global et Sentry", () => {
  it("envoie une 500, nettoyée, avec app, environnement et release", async () => {
    const res = await fetch(`${base}/v1/essai/panne?token=SECRET`, {
      headers: { cookie: "session=abc", authorization: "Bearer xyz" },
    });
    expect(res.status).toBe(500);
    await flush(5_000);

    const [evenement, ...autres] = evenements();
    expect(autres).toEqual([]);
    expect(evenement).toMatchObject({
      environment: "preprod",
      release: "sha-e2e",
      tags: { app: "api", subsystem: "http" },
    });
    const brut = JSON.stringify(evenement);
    expect(brut).toContain("échec pour [retiré]");
    // Ni l'adresse, ni le jeton d'URL, ni cookie, ni en-tête d'autorisation.
    expect(brut).not.toMatch(/parent@exemple\.fr|SECRET|session=abc|Bearer xyz/);
  });

  it("n'envoie ni une 404 ni le 503 attendu d'une sonde", async () => {
    recues.length = 0;
    expect((await fetch(`${base}/v1/essai/absent`)).status).toBe(404);
    await fetch(`${base}/v1/health/ready`);
    await flush(5_000);
    expect(evenements()).toEqual([]);
  });
});
