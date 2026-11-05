import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AppModule } from "../src/app.module";
import { HttpExceptionFilter } from "../src/common/http-exception.filter";

// L'API réelle, configurée comme main.ts, contre le PostgreSQL et le Redis de test.
let app: INestApplication;
let base: string;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication({ logger: false });
  app.setGlobalPrefix("v1");
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(0, "127.0.0.1");
  base = await app.getUrl();
});

afterAll(async () => {
  await app?.close();
});

describe("GET /v1/health", () => {
  it("répond que le process vit, sans version ni nom d'hôte", async () => {
    const res = await fetch(`${base}/v1/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", service: "api" });
  });
});

describe("GET /v1/health/ready", () => {
  it("sonde la base et Redis, une entrée chacun", async () => {
    const res = await fetch(`${base}/v1/health/ready`);
    const corps = (await res.json()) as { status: string; details: Record<string, unknown> };
    expect(res.status).toBe(200);
    expect(corps.status).toBe("ok");
    expect(corps.details).toEqual({ db: { status: "up" }, redis: { status: "up" } });
  });
});

describe("route inconnue", () => {
  it("répond 404 en problem+json", async () => {
    const res = await fetch(`${base}/v1/inexistante`);
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toMatch(/^application\/problem\+json/);
    expect(await res.json()).toMatchObject({ status: 404 });
  });
});
