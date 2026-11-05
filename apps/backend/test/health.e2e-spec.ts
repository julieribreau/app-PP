import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { startApp } from "./app";

// L'API réelle, configurée comme main.ts, contre le PostgreSQL et le Redis de test.
let ctx: Awaited<ReturnType<typeof startApp>>;

beforeAll(async () => {
  ctx = await startApp();
});

afterAll(async () => {
  await ctx?.close();
});

describe("GET /v1/health", () => {
  it("répond que le process vit, sans version ni nom d'hôte", async () => {
    const res = await fetch(`${ctx.base}/v1/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", service: "api" });
  });
});

describe("GET /v1/health/ready", () => {
  it("sonde la base, Redis et le stockage, une entrée chacun", async () => {
    const res = await fetch(`${ctx.base}/v1/health/ready`);
    const corps = (await res.json()) as { status: string; details: Record<string, unknown> };
    expect(res.status).toBe(200);
    expect(corps.status).toBe("ok");
    expect(corps.details).toEqual({
      db: { status: "up" },
      redis: { status: "up" },
      storage: { status: "up" },
    });
  });
});

describe("route inconnue", () => {
  it("répond 404 au format du contrat", async () => {
    const res = await fetch(`${ctx.base}/v1/inexistante`);
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ statusCode: 404, code: "NOT_FOUND" });
  });
});
