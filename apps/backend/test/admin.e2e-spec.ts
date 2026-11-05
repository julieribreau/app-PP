import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { seedCatalog } from "../src/seed/seed-catalog";
import { Client, startApp } from "./app";
import { makeAdmin, PASSWORD, signUpVerified, totp } from "./helpers";

let ctx: Awaited<ReturnType<typeof startApp>>;
let admin: Client;
let secret: string;
const adminEmail = "admin-e2e@exemple.fr";

beforeAll(async () => {
  ctx = await startApp();
  await seedCatalog(ctx.db);
  await signUpVerified(ctx, "usager-e2e@exemple.fr", { firstName: "Usager", lastName: "Lambda" });
  await signUpVerified(ctx, adminEmail, { firstName: "Admin", lastName: "E2E" });
  await makeAdmin(ctx, adminEmail);
  admin = new Client(ctx.base);
  await admin.req("POST", "/v1/auth/sign-in/email", { email: adminEmail, password: PASSWORD });
});
afterAll(async () => {
  await ctx?.close();
});

describe("accès au back-office", () => {
  it("refuse un usager", async () => {
    const usager = new Client(ctx.base);
    await usager.req("POST", "/v1/auth/sign-in/email", {
      email: "usager-e2e@exemple.fr",
      password: PASSWORD,
    });
    expect((await usager.req("GET", "/v1/admin/users")).json).toMatchObject({
      statusCode: 403,
      code: "FORBIDDEN",
    });
  });

  it("refuse un admin sans double authentification", async () => {
    expect((await admin.req("GET", "/v1/admin/users")).json).toMatchObject({
      statusCode: 403,
      code: "TWO_FACTOR_REQUIRED",
    });
  });

  it("ouvre après activation de la 2FA, puis l'exige à la connexion", async () => {
    const enable = await admin.req("POST", "/v1/auth/two-factor/enable", { password: PASSWORD });
    expect(enable.status).toBe(200);
    secret = new URL(enable.json.totpURI).searchParams.get("secret")!;
    expect(enable.json.backupCodes.length).toBeGreaterThan(0);
    expect(
      (await admin.req("POST", "/v1/auth/two-factor/verify-totp", { code: totp(secret) })).status,
    ).toBe(200);
    expect((await admin.req("GET", "/v1/admin/users")).status).toBe(200);

    const fresh = new Client(ctx.base);
    const signIn = await fresh.req("POST", "/v1/auth/sign-in/email", {
      email: adminEmail,
      password: PASSWORD,
    });
    expect(signIn.json.twoFactorRedirect).toBe(true);
    expect((await fresh.req("GET", "/v1/admin/users")).status).toBe(401);
    expect(
      (await fresh.req("POST", "/v1/auth/two-factor/verify-totp", { code: totp(secret) })).status,
    ).toBe(200);
    expect((await fresh.req("GET", "/v1/admin/users")).status).toBe(200);
  });
});

describe("usagers", () => {
  it("liste, filtre, trie et compte", async () => {
    const res = (await admin.req("GET", "/v1/admin/users?q=lambda&pageSize=10")).json;
    expect(res.items).toHaveLength(1);
    expect(res.items[0]).toMatchObject({
      name: "Usager Lambda",
      role: "user",
      status: "active",
      cartTotalCents: 0,
    });
    expect(res.counts.total).toBeGreaterThanOrEqual(2);
    expect(
      (await admin.req("GET", "/v1/admin/users?role=admin")).json.items.map(
        (u: { email: string }) => u.email,
      ),
    ).toContain(adminEmail);
    expect((await admin.req("GET", "/v1/admin/users?pageSize=7")).json.code).toBe(
      "VALIDATION_FAILED",
    );
  });

  it("suspend, journalise, réactive ; jamais soi-même", async () => {
    const target = (await admin.req("GET", "/v1/admin/users?q=lambda")).json.items[0];
    const suspended = await admin.req("POST", `/v1/admin/users/${target.id}/suspend`, {
      reason: "Test e2e",
    });
    expect(suspended.json).toMatchObject({ status: "suspended", suspendedReason: "Test e2e" });
    const me = (await admin.req("GET", `/v1/admin/users?q=${encodeURIComponent(adminEmail)}`)).json
      .items[0];
    expect(
      (await admin.req("POST", `/v1/admin/users/${me.id}/suspend`, { reason: "x" })).json.code,
    ).toBe("CANNOT_TARGET_SELF");
    expect((await admin.req("POST", `/v1/admin/users/${target.id}/reactivate`)).json.status).toBe(
      "active",
    );
    const audit = (await admin.req("GET", `/v1/admin/audit?targetType=user&targetId=${target.id}`))
      .json;
    expect(audit.items.map((a: { action: string }) => a.action)).toEqual([
      "account.reactivate",
      "account.suspend",
    ]);
    expect(audit.items[0].actor.name).toBe("Admin E2E");
  });

  it("exporte en CSV", async () => {
    const res = await fetch(`${ctx.base}/v1/admin/users/export?q=lambda`, {
      headers: { cookie: `nutrion.session_token=${admin.cookie("nutrion.session_token")}` },
    });
    const bytes = Buffer.from(await res.arrayBuffer());
    expect(res.headers.get("content-type")).toMatch(/^text\/csv/);
    // BOM en tête (Excel lit l'UTF-8) ; fetch().text() l'aurait retiré au décodage.
    expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const csv = bytes.subarray(3).toString("utf8");
    expect(csv.split("\r\n")[0]).toBe(
      "id;prénom;nom;e-mail;rôle;statut;e-mail vérifié;inscription;dernière connexion;panier (€ TTC)",
    );
    expect(csv).toContain("usager-e2e@exemple.fr");
  });
});

describe("catalogue au back-office", () => {
  it("crée un produit, ses axes, ses variantes, et l'expose une fois actif", async () => {
    const cats = (await admin.req("GET", "/v1/admin/categories")).json;
    const created = await admin.req("POST", "/v1/admin/products", {
      categoryId: cats[0].id,
      name: { fr: "Barre test", en: "Test bar" },
      description: { fr: '<p onclick="x">Bon <script>alert(1)</script></p>' },
      priceCents: 300,
    });
    expect(created.status).toBe(201);
    expect(created.json).toMatchObject({
      slug: "barre-test",
      status: "draft",
      description: { fr: "<p>Bon </p>" },
    });
    expect(created.json.variants).toHaveLength(1);

    const withOptions = (
      await admin.req("PUT", `/v1/admin/products/${created.json.id}/options`, [
        {
          name: { fr: "Saveur" },
          values: [{ label: { fr: "Cacao" } }, { label: { fr: "Vanille" } }],
        },
        {
          name: { fr: "Format" },
          values: [{ label: { fr: "Unité" } }, { label: { fr: "Boîte" } }],
        },
      ])
    ).json;
    expect(withOptions.variants.filter((v: { isActive: boolean }) => v.isActive)).toHaveLength(4);
    const boite = withOptions.variants.find(
      (v: { label: string }) => v.label === "Vanille · Boîte",
    );
    const patched = (
      await admin.req("PATCH", `/v1/admin/products/${created.json.id}/variants`, {
        variants: [{ id: boite.id, priceCents: 3200, stock: 7, sku: "TST-VAN-B" }],
      })
    ).json;
    expect(patched.variants.find((v: { id: string }) => v.id === boite.id)).toMatchObject({
      priceCents: 3200,
      effectivePriceCents: 3200,
      stock: 7,
      sku: "TST-VAN-B",
    });

    expect((await fetch(`${ctx.base}/v1/catalog/products/barre-test`)).status).toBe(404);
    await admin.req("PATCH", `/v1/admin/products/${created.json.id}`, { status: "active" });
    const pub = (await (await fetch(`${ctx.base}/v1/catalog/products/barre-test`)).json()) as {
      variants: unknown[];
    };
    expect(pub.variants).toHaveLength(4);

    const list = (await admin.req("GET", "/v1/admin/products?q=barre%20test")).json;
    expect(list.items[0]).toMatchObject({
      name: "Barre test",
      variantCount: 4,
      stockTotal: null,
      status: "active",
    });
    expect((await admin.req("DELETE", `/v1/admin/products/${created.json.id}`)).status).toBe(204);
  });

  it("refuse de supprimer une catégorie non vide", async () => {
    const cats = (await admin.req("GET", "/v1/admin/categories")).json;
    expect((await admin.req("DELETE", `/v1/admin/categories/${cats[0].id}`)).json.code).toBe(
      "CATEGORY_NOT_EMPTY",
    );
  });
});
