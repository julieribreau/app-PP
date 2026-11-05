import { strFromU8, unzipSync } from "fflate";
import { user } from "@nutrion/db-schema";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { Client, startApp } from "./app";
import { PASSWORD, signUpVerified } from "./helpers";

let ctx: Awaited<ReturnType<typeof startApp>>;
let client: Client;
const email = "compte@exemple.fr";

beforeAll(async () => {
  ctx = await startApp();
  client = await signUpVerified(ctx, email);
});
afterAll(async () => {
  await ctx?.close();
});

describe("espace personnel", () => {
  it("rend et met à jour le profil", async () => {
    expect((await client.req("GET", "/v1/account/me")).json).toMatchObject({
      email,
      firstName: "Test",
      role: "user",
      theme: "system",
      locale: "fr",
    });
    const res = await client.req("PATCH", "/v1/account/me", {
      firstName: "Camille",
      phone: "06 11 22 33 44",
      theme: "dark",
      locale: "en",
    });
    expect(res.json).toMatchObject({
      firstName: "Camille",
      phone: "06 11 22 33 44",
      theme: "dark",
      locale: "en",
    });
    expect((await client.req("PATCH", "/v1/account/me", { theme: "violet" })).json.code).toBe(
      "VALIDATION_FAILED",
    );
  });

  it("refuse sans session", async () => {
    expect((await new Client(ctx.base).req("GET", "/v1/account/me")).status).toBe(401);
  });
});

describe("adresses", () => {
  it("gère les adresses, une seule par défaut", async () => {
    const a = (
      await client.req("POST", "/v1/account/addresses", {
        recipientName: "Camille",
        line1: "12 rue des Tanneurs",
        postalCode: "69007",
        city: "Lyon",
      })
    ).json;
    expect(a.isDefault).toBe(true);
    const b = (
      await client.req("POST", "/v1/account/addresses", {
        label: "Bureau",
        recipientName: "Camille",
        line1: "48 cours Lafayette",
        postalCode: "69003",
        city: "Lyon",
      })
    ).json;
    expect(b.isDefault).toBe(false);
    await client.req("POST", `/v1/account/addresses/${b.id}/default`);
    const list = (await client.req("GET", "/v1/account/addresses")).json;
    expect(list.map((x: { id: string; isDefault: boolean }) => [x.id, x.isDefault])).toEqual([
      [b.id, true],
      [a.id, false],
    ]);
    expect((await client.req("DELETE", `/v1/account/addresses/${b.id}`)).status).toBe(204);
    expect((await client.req("GET", "/v1/account/addresses")).json[0]).toMatchObject({
      id: a.id,
      isDefault: true,
    });
  });
});

describe("droits RGPD", () => {
  it("exporte les données en ZIP", async () => {
    const res = await fetch(`${ctx.base}/v1/account/export`, {
      headers: {
        cookie: `nutrion.session_token=${client.cookie("nutrion.session_token")}`,
        "accept-language": "fr",
      },
    });
    expect(res.headers.get("content-type")).toBe("application/zip");
    const files = unzipSync(new Uint8Array(await res.arrayBuffer()));
    expect(Object.keys(files).sort()).toEqual([
      "LISEZ-MOI.txt",
      "adresses.json",
      "panier.json",
      "profil.json",
      "sessions.json",
    ]);
    expect(JSON.parse(strFromU8(files["profil.json"]!)).email).toBe(email);
  });

  it("supprime le compte par anonymisation et coupe la session", async () => {
    expect((await client.req("DELETE", "/v1/account", { confirm: "non" })).status).toBe(400);
    expect((await client.req("DELETE", "/v1/account", { confirm: "SUPPRIMER" })).status).toBe(204);
    const [row] = await ctx.db.select().from(user).where(eq(user.email, email));
    expect(row).toBeUndefined();
    expect((await client.req("GET", "/v1/account/me")).status).toBe(401);
    expect(
      (
        await new Client(ctx.base).req("POST", "/v1/auth/sign-in/email", {
          email,
          password: PASSWORD,
        })
      ).status,
    ).toBe(401);
  });
});
