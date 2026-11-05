import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { createDb } from "@nutrion/db";

import { AppModule } from "../src/app.module";
import { configureApp } from "../src/bootstrap";
import { MAIL } from "../src/modules/mail/mail.port";
import { MemoryMailAdapter } from "../src/modules/mail/memory-mail.adapter";
import { MemoryStorageAdapter } from "../src/modules/storage/memory-storage.adapter";
import { STORAGE } from "../src/modules/storage/storage.port";

/** L'API réelle (configureApp, comme main.ts), e-mails et stockage objet en mémoire. */
export async function startApp() {
  const mail = new MemoryMailAdapter();
  const storage = new MemoryStorageAdapter();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(MAIL)
    .useValue(mail)
    .overrideProvider(STORAGE)
    .useValue(storage)
    .compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({
    logger: false,
    bodyParser: false,
  });
  configureApp(app);
  await app.listen(0, "127.0.0.1");
  const base = (await app.getUrl()).replace("[::1]", "127.0.0.1");
  const db = createDb(process.env["DATABASE_URL"]!);
  return {
    app,
    base,
    mail,
    storage,
    db,
    async close() {
      await (db as unknown as { $client: { end(): Promise<void> } }).$client.end();
      await app.close();
    },
  };
}

/** Un client HTTP qui garde ses cookies, comme un navigateur derrière le proxy du site. */
export class Client {
  private readonly cookies = new Map<string, string>();

  constructor(private readonly base: string) {}

  cookie(name: string) {
    return this.cookies.get(name);
  }

  private headers(body: unknown, extra: Record<string, string>) {
    const h: Record<string, string> = { origin: "http://localhost:3000", ...extra };
    if (body !== undefined) h["content-type"] = "application/json";
    if (this.cookies.size) h["cookie"] = [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
    return h;
  }

  private keep(setCookies: string[]) {
    for (const line of setCookies) {
      const [pair] = line.split(";");
      const [k, ...v] = (pair ?? "").split("=");
      const value = v.join("=");
      const expired = /max-age=0|expires=thu, 01 jan 1970/i.test(line) || value === "";
      if (expired) this.cookies.delete(k!.trim());
      else this.cookies.set(k!.trim(), value);
    }
  }

  async req(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
    const res = await fetch(`${this.base}${path}`, {
      method,
      redirect: "manual",
      headers: this.headers(body, headers),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    this.keep(res.headers.getSetCookie());
    const text = await res.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : undefined;
    } catch {
      json = text;
    }
    return { status: res.status, headers: res.headers, json: json as any }; // eslint-disable-line @typescript-eslint/no-explicit-any
  }
}
