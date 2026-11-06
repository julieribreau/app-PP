import { afterAll, describe, expect, it } from "vitest";

import { mergeGuestCart } from "@/hooks/cart/useCart";
import type { ApiError } from "@/lib/api/client";
import { api, cartTokens } from "@/lib/api/client";
import { API_URL } from "@/lib/api/config";
import { authClient } from "@/lib/auth/auth-client";
import { requestPasswordReset } from "@/lib/auth/password-reset";
import { signUpPayload } from "@/lib/auth/validation";
import { usePrefsStore } from "@/stores/prefs.store";
import type { Address, Cart, Category, Me, Page, ProductDetail, ProductSummary } from "@/types/api";

// Code réel de l'app (client API, jeton panier, client Better Auth Expo, fusion) contre le
// backend démarré et seedé. Seuls les modules natifs sont des doubles (src/test/native-modules).
const MAILPIT = process.env["MAILPIT_URL"] ?? "http://localhost:8025";
const CAMILLE = { email: "camille.martin@exemple.fr", password: "Nutrion-Demo-2026" };

async function latestMailLink(to: string, fragment: string): Promise<string> {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
    const { messages } = (await res.json()) as { messages: { ID: string; Created: string }[] };
    if (messages.length) {
      const msg = (await (await fetch(`${MAILPIT}/api/v1/message/${messages[0]!.ID}`)).json()) as {
        Text: string;
      };
      const link = msg.Text.match(/https?:\/\/\S+/g)?.find((l) => l.includes(fragment));
      if (link) return link;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`aucun lien ${fragment} pour ${to}`);
}

describe("mobile ↔ backend (intégration réelle)", () => {
  let slug = "";
  let variantId = "";

  afterAll(async () => {
    usePrefsStore.getState().setLocale("fr");
  });

  it("catalogue : catégories, liste et fiche produit", async () => {
    const categories = await api.get<Category[]>("/catalog/categories");
    expect(categories.map((c) => c.slug)).toContain("barres-cereales");
    const page = await api.get<Page<ProductSummary>>(
      "/catalog/products?category=barres-cereales&pageSize=24",
    );
    expect(page.items.length).toBeGreaterThan(0);
    slug = page.items[0]!.slug;
    const product = await api.get<ProductDetail>(`/catalog/products/${slug}`);
    expect(product.options.length).toBeGreaterThan(0);
    const available = product.variants.find((v) => v.available);
    expect(available).toBeDefined();
    variantId = available!.id;
  });

  it("panier invité : le jeton X-Cart-Token est gardé et renvoyé", async () => {
    await cartTokens.clear();
    expect(await cartTokens.get()).toBeNull();
    const added = await api.post<Cart>("/cart/items", { variantId, quantity: 2 });
    expect(added.items.find((i) => i.variantId === variantId)?.quantity).toBe(2);
    const token = await cartTokens.get();
    expect(token).toMatch(/.{16,}/);
    const reread = await api.get<Cart>("/cart");
    expect(reread.id).toBe(added.id);
    expect(reread.itemCount).toBe(2);
  });

  it("connexion e-mail de Camille puis fusion du panier invité", async () => {
    const before = await (async () => {
      const r = await fetch(`${API_URL}/v1/auth/sign-in/email`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:3000" },
        body: JSON.stringify(CAMILLE),
      });
      const cookie = r.headers.get("set-cookie")?.split(";")[0] ?? "";
      const cart = (await (
        await fetch(`${API_URL}/v1/cart`, { headers: { cookie } })
      ).json()) as Cart;
      return cart.items.find((i) => i.variantId === variantId)?.quantity ?? 0;
    })();

    const { data, error } = await authClient.signIn.email(CAMILLE);
    expect(error).toBeNull();
    expect(data?.user.email).toBe(CAMILLE.email);
    expect(await authClient.getCookie()).toMatch(/nutrion\.session_token=/);

    const cart = await mergeGuestCart();
    expect(cart.merged).toBe(true);
    const line = cart.items.find((i) => i.variantId === variantId)!;
    expect(line.quantity).toBe(Math.min(before + 2, line.maxQuantity ?? Infinity));
    expect(await cartTokens.get()).toBeNull();
  });

  it("profil : lecture et modification", async () => {
    const me = await api.get<Me>("/account/me");
    expect(me.email).toBe(CAMILLE.email);
    const phone = `06 ${String(Date.now())
      .slice(-8)
      .replace(/(\d\d)(?=\d)/g, "$1 ")}`;
    const updated = await api.patch<Me>("/account/me", { phone });
    expect(updated.phone).toBe(phone);
    expect((await api.get<Me>("/account/me")).phone).toBe(phone);
  });

  it("adresses : ajout, liste, adresse par défaut, suppression", async () => {
    const created = await api.post<Address>("/account/addresses", {
      label: "Mobile",
      recipientName: "Camille Martin",
      line1: "8 place Bellecour",
      postalCode: "69002",
      city: "Lyon",
      countryCode: "FR",
    });
    expect((await api.get<Address[]>("/account/addresses")).map((a) => a.id)).toContain(created.id);
    const def = await api.post<Address>(`/account/addresses/${created.id}/default`);
    expect(def.isDefault).toBe(true);
    const all = await api.get<Address[]>("/account/addresses");
    expect(all.filter((a) => a.isDefault)).toHaveLength(1);
    await api.delete(`/account/addresses/${created.id}`);
    expect((await api.get<Address[]>("/account/addresses")).map((a) => a.id)).not.toContain(
      created.id,
    );
  });

  it("préférences : langue et thème sur le profil, langue envoyée à l'API", async () => {
    usePrefsStore.getState().setLocale("en");
    const me = await api.patch<Me>("/account/me", { locale: "en", theme: "dark" });
    expect([me.locale, me.theme]).toEqual(["en", "dark"]);
    const categories = await api.get<Category[]>("/catalog/categories");
    expect(categories.find((c) => c.slug === "barres-cereales")?.name).not.toBe("Barres céréales");
    usePrefsStore.getState().setLocale("fr");
    const back = await api.patch<Me>("/account/me", { locale: "fr", theme: "system" });
    expect([back.locale, back.theme]).toEqual(["fr", "system"]);
  });

  it("sessions : l'appareil apparaît dans les appareils connectés", async () => {
    const { data } = await authClient.listSessions();
    expect(data?.length).toBeGreaterThan(0);
  });

  it("mot de passe oublié depuis l'app : le lien ouvre la page du site", async () => {
    await requestPasswordReset(CAMILLE.email);
    const link = await latestMailLink(CAMILLE.email, "reset-password");
    const res = await fetch(link, { redirect: "manual" });
    const location = res.headers.get("location") ?? "";
    expect(location).toMatch(/^http:\/\/localhost:3000\/fr\/reinitialiser-mot-de-passe\?token=/);
  });

  it("inscription depuis l'app en anglais : l'e-mail de confirmation est en anglais", async () => {
    const email = `qa-e2e+integration-${Date.now()}@exemple.test`;
    const { error } = await authClient.signUp.email(
      signUpPayload(
        { firstName: "Alex", lastName: "Durand", email, password: `Qa-${Date.now()}-9` },
        "en",
      ),
    );
    expect(error).toBeNull();
    const link = await latestMailLink(email, "verify-email");
    expect(link).toContain("%2Fen%2F");
    const search = await fetch(
      `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`,
    );
    const { messages } = (await search.json()) as { messages: { Subject: string }[] };
    expect(messages[0]?.Subject).toBe("Confirm your email address");
  });

  it("déconnexion : le profil n'est plus lisible", async () => {
    await authClient.signOut();
    await expect(api.get<Me>("/account/me")).rejects.toMatchObject({
      status: 401,
    } satisfies Partial<ApiError>);
  });
});
