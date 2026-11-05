import { user } from "@nutrion/db-schema";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { seedCatalog } from "../src/seed/seed-catalog";
import { Client, startApp } from "./app";
import { mailLink, makeAdmin, PASSWORD, signUpVerified, totp } from "./helpers";

// Exigences du lot 1 que les autres suites ne couvraient pas encore (docs/qa/matrice-tests.md) :
// photos (produit, profil), e-mail et mot de passe, sessions, rôles, garde-fous du back-office.

let ctx: Awaited<ReturnType<typeof startApp>>;
let admin: Client;
let backupCodes: string[];
let secret: string;
const adminEmail = "admin-finition@exemple.fr";

const PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 1,
  0, 0, 0, 1, 8, 6, 0, 0, 0, 0x1f, 0x15, 0xc4, 0x89,
]);

async function firstVariantOf(slug: string) {
  const res = await new Client(ctx.base).req("GET", `/v1/catalog/products/${slug}`);
  return { productId: res.json.id as string, variantId: res.json.variants[0].id as string };
}

beforeAll(async () => {
  ctx = await startApp();
  await seedCatalog(ctx.db);
  await signUpVerified(ctx, adminEmail, { firstName: "Admin", lastName: "Finition" });
  await makeAdmin(ctx, adminEmail);
  admin = new Client(ctx.base);
  await admin.req("POST", "/v1/auth/sign-in/email", { email: adminEmail, password: PASSWORD });
  const enable = await admin.req("POST", "/v1/auth/two-factor/enable", { password: PASSWORD });
  secret = new URL(enable.json.totpURI).searchParams.get("secret")!;
  backupCodes = enable.json.backupCodes;
  await admin.req("POST", "/v1/auth/two-factor/verify-totp", { code: totp(secret) });
});
afterAll(async () => {
  await ctx?.close();
});

describe("photo produit", () => {
  it("s'envoie, s'expose partout, se remplace et se retire", async () => {
    const { productId } = await firstVariantOf("avoine-cacao");
    const up = await admin.upload(
      `/v1/admin/products/${productId}/image`,
      PNG,
      "image/png",
      "a.png",
    );
    expect(up.status).toBe(200);
    // La réponse est la fiche admin complète (contrat), que le back-office affiche telle quelle.
    expect(up.json).toMatchObject({ id: productId, imageUrl: expect.any(String) });
    expect(up.json.variants.length).toBeGreaterThan(0);
    const first = (await admin.req("GET", `/v1/admin/products/${productId}`)).json.imageUrl;
    expect(first).toEqual(expect.any(String));
    const publicDetail = await new Client(ctx.base).req("GET", "/v1/catalog/products/avoine-cacao");
    expect(publicDetail.json.imageUrl).toEqual(expect.any(String));
    const list = await new Client(ctx.base).req("GET", "/v1/catalog/products?q=avoine");
    expect(
      list.json.items.find((p: { slug: string }) => p.slug === "avoine-cacao").imageUrl,
    ).toEqual(expect.any(String));
    await admin.upload(`/v1/admin/products/${productId}/image`, PNG, "image/png", "b.png");
    const second = (await admin.req("GET", `/v1/admin/products/${productId}`)).json.imageUrl;
    expect(second).not.toBe(first);
    // Le remplacement efface l’ancienne photo du stockage : une seule reste pour ce produit.
    const kept = [...ctx.storage.objects.keys()].filter((k) =>
      k.startsWith(`products/${productId}/`),
    );
    expect(kept).toHaveLength(1);
    expect(
      (await admin.req("DELETE", `/v1/admin/products/${productId}/image`)).status,
    ).toBeLessThan(300);
    expect((await admin.req("GET", `/v1/admin/products/${productId}`)).json.imageUrl).toBeNull();
  });

  it("refuse un faux PNG, un autre format et un fichier de plus de 2 Mo", async () => {
    const { productId } = await firstVariantOf("avoine-cacao");
    const fake = new TextEncoder().encode("<svg onload=alert(1)>");
    const asPng = await admin.upload(`/v1/admin/products/${productId}/image`, fake, "image/png");
    expect(asPng.status).toBe(415);
    expect(asPng.json.code).toBe("UNSUPPORTED_MEDIA_TYPE");
    const pdf = await admin.upload(
      `/v1/admin/products/${productId}/image`,
      new TextEncoder().encode("%PDF-1.4"),
      "application/pdf",
    );
    expect(pdf.status).toBe(415);
    const big = new Uint8Array(2 * 1024 * 1024 + 10);
    big.set(PNG);
    const tooBig = await admin.upload(`/v1/admin/products/${productId}/image`, big, "image/png");
    expect(tooBig.status).toBe(413);
  });
});

describe("photo de profil", () => {
  it("s'envoie, apparaît dans le profil, se retire ; refuse un faux fichier", async () => {
    const client = await signUpVerified(ctx, "avatar-finition@exemple.fr");
    expect((await client.req("GET", "/v1/account/me")).json.imageUrl).toBeNull();
    const up = await client.upload("/v1/account/me/avatar", PNG, "image/png", "moi.png");
    expect(up.status).toBe(200);
    expect(up.json.imageUrl).toEqual(expect.any(String));
    expect((await client.req("GET", "/v1/account/me")).json.imageUrl).toEqual(expect.any(String));
    const fake = await client.upload(
      "/v1/account/me/avatar",
      new TextEncoder().encode("pas une image"),
      "image/jpeg",
    );
    expect(fake.status).toBe(415);
    expect((await client.req("DELETE", "/v1/account/me/avatar")).status).toBeLessThan(300);
    expect((await client.req("GET", "/v1/account/me")).json.imageUrl).toBeNull();
  });
});

describe("e-mail, mot de passe et sessions", () => {
  it("change l'e-mail après confirmation de la nouvelle adresse", async () => {
    const client = await signUpVerified(ctx, "ancienne-finition@exemple.fr");
    const newEmail = "nouvelle-finition@exemple.fr";
    const res = await client.req("POST", "/v1/auth/change-email", {
      newEmail,
      callbackURL: "/fr/compte",
    });
    expect(res.status).toBe(200);
    // Tant que la nouvelle adresse n'est pas confirmée, le compte garde l'ancienne.
    expect((await client.req("GET", "/v1/account/me")).json.email).toBe(
      "ancienne-finition@exemple.fr",
    );
    const link = mailLink(ctx, newEmail);
    expect((await client.req("GET", link.replace(ctx.base, ""))).status).toBeLessThan(400);
    expect((await client.req("GET", "/v1/account/me")).json.email).toBe(newEmail);
    const fresh = new Client(ctx.base);
    const login = await fresh.req("POST", "/v1/auth/sign-in/email", {
      email: newEmail,
      password: PASSWORD,
    });
    expect(login.status).toBe(200);
  });

  it("change le mot de passe : l'ancien ne marche plus, le nouveau oui", async () => {
    const email = "mdp-finition@exemple.fr";
    const client = await signUpVerified(ctx, email);
    const next = "Nouveau-mot-2026";
    const res = await client.req("POST", "/v1/auth/change-password", {
      currentPassword: PASSWORD,
      newPassword: next,
      revokeOtherSessions: true,
    });
    expect(res.status).toBe(200);
    const old = await new Client(ctx.base).req("POST", "/v1/auth/sign-in/email", {
      email,
      password: PASSWORD,
    });
    expect(old.status).toBe(401);
    const ok = await new Client(ctx.base).req("POST", "/v1/auth/sign-in/email", {
      email,
      password: next,
    });
    expect(ok.status).toBe(200);
  });

  it("liste les sessions et révoque celle d'un autre appareil", async () => {
    const email = "sessions-finition@exemple.fr";
    const laptop = await signUpVerified(ctx, email);
    const phone = new Client(ctx.base);
    await phone.req(
      "POST",
      "/v1/auth/sign-in/email",
      { email, password: PASSWORD },
      { "user-agent": "NutrionApp iPhone" },
    );
    const sessions = (await laptop.req("GET", "/v1/auth/list-sessions")).json as {
      token: string;
      userAgent: string;
    }[];
    expect(sessions.length).toBeGreaterThanOrEqual(2);
    const other = sessions.find((s) => s.userAgent === "NutrionApp iPhone")!;
    expect(
      (await laptop.req("POST", "/v1/auth/revoke-session", { token: other.token })).status,
    ).toBe(200);
    expect((await phone.req("GET", "/v1/account/me")).status).toBe(401);
    expect((await laptop.req("GET", "/v1/account/me")).status).toBe(200);
  });
});

describe("double authentification", () => {
  it("un code de secours ouvre la session, une seule fois", async () => {
    const first = new Client(ctx.base);
    const signIn = await first.req("POST", "/v1/auth/sign-in/email", {
      email: adminEmail,
      password: PASSWORD,
    });
    expect(signIn.json.twoFactorRedirect).toBe(true);
    const code = backupCodes[0]!;
    expect(
      (await first.req("POST", "/v1/auth/two-factor/verify-backup-code", { code })).status,
    ).toBe(200);
    expect((await first.req("GET", "/v1/admin/users")).status).toBe(200);
    const second = new Client(ctx.base);
    await second.req("POST", "/v1/auth/sign-in/email", { email: adminEmail, password: PASSWORD });
    expect(
      (await second.req("POST", "/v1/auth/two-factor/verify-backup-code", { code })).status,
    ).toBe(401);
  });
});

describe("rôles", () => {
  it("un usager promu admin doit à son tour activer sa 2FA ; un admin ne se rétrograde pas", async () => {
    const email = "promu-finition@exemple.fr";
    const promoted = await signUpVerified(ctx, email);
    const [row] = await ctx.db.select().from(user).where(eq(user.email, email));
    expect((await promoted.req("GET", "/v1/admin/users")).json.code).toBe("FORBIDDEN");
    expect(
      (await admin.req("PATCH", `/v1/admin/users/${row!.id}/role`, { role: "admin" })).status,
    ).toBe(200);
    const again = new Client(ctx.base);
    await again.req("POST", "/v1/auth/sign-in/email", { email, password: PASSWORD });
    expect((await again.req("GET", "/v1/admin/users")).json.code).toBe("TWO_FACTOR_REQUIRED");

    const me = (await admin.req("GET", "/v1/account/me")).json.id as string;
    const self = await admin.req("PATCH", `/v1/admin/users/${me}/role`, { role: "user" });
    expect(self.status).toBeGreaterThanOrEqual(400);
    expect((await admin.req("GET", "/v1/admin/users")).status).toBe(200);
  });
});

describe("garde-fous du catalogue", () => {
  it("refuse de supprimer un produit présent dans un panier", async () => {
    const { productId, variantId } = await firstVariantOf("amande-miel");
    const guest = new Client(ctx.base);
    expect((await guest.req("POST", "/v1/cart/items", { variantId, quantity: 1 })).status).toBe(
      201,
    );
    const del = await admin.req("DELETE", `/v1/admin/products/${productId}`);
    expect(del.status).toBe(409);
    expect(del.json.code).toBe("PRODUCT_IN_CART");
  });

  it("nettoie la description : un script injecté ne ressort ni au back-office ni en boutique", async () => {
    const cats = (await admin.req("GET", "/v1/admin/categories")).json as { id: string }[];
    const created = await admin.req("POST", "/v1/admin/products", {
      categoryId: cats[0]!.id,
      name: { fr: "Barre test XSS", en: "XSS test bar" },
      summary: { fr: "Résumé", en: "Summary" },
      description: {
        fr: '<p>Bon <strong>goût</strong></p><script>alert(1)</script><img src=x onerror=alert(2)><a href="javascript:alert(3)">lien</a>',
        en: "<p>Tasty</p>",
      },
      priceCents: 250,
      vatRateBps: 550,
      status: "active",
    });
    expect(created.status).toBe(201);
    const detail = (await admin.req("GET", `/v1/admin/products/${created.json.id}`)).json;
    expect(detail.description.fr).toContain("<strong>goût</strong>");
    for (const html of [
      detail.description.fr,
      (await new Client(ctx.base).req("GET", `/v1/catalog/products/${created.json.slug}`)).json
        .descriptionHtml,
    ]) {
      expect(html).not.toMatch(/<script|onerror|javascript:|<img/i);
    }
    // Un PATCH partiel (description seule) garde le statut et la TVA : le produit reste en vente.
    const patched = await admin.req("PATCH", `/v1/admin/products/${created.json.id}`, {
      description: { fr: "<p>Autre</p>", en: "<p>Other</p>" },
    });
    expect(patched.json).toMatchObject({ status: "active", vatRateBps: 550 });
    expect(
      (await new Client(ctx.base).req("GET", `/v1/catalog/products/${created.json.slug}`)).status,
    ).toBe(200);
    // Rien ne reste en boutique pour les autres suites (comptes de produits par catégorie).
    expect((await admin.req("DELETE", `/v1/admin/products/${created.json.id}`)).status).toBe(204);
  });
});
