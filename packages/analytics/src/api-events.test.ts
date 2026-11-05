import { describe, expect, it, vi } from "vitest";

import {
  eventForApiCall,
  normalizePath,
  PERSONAL_KEYS,
  scrubProperties,
  trackApiCall,
} from "./index";

const cart = { itemCount: 3, totalCents: 870, merged: true, items: [] };

describe("événements métier tirés des appels d'API", () => {
  it("normalise l'URL : hôte, requête et préfixe du proxy web retirés", () => {
    expect(normalizePath("http://localhost:3000/api/v1/cart/items/abc?x=1")).toBe(
      "/v1/cart/items/abc",
    );
    expect(normalizePath("/v1/account/me/")).toBe("/v1/account/me");
  });

  it("panier : ajout, modification, suppression, fusion, avec les totaux et sans le contenu", () => {
    expect(
      eventForApiCall({
        method: "post",
        path: "/api/v1/cart/items",
        status: 201,
        requestBody: { variantId: "v1", quantity: 2 },
        responseBody: cart,
      }),
    ).toEqual({
      name: "cart.item_added",
      properties: { variantId: "v1", quantity: 2, itemCount: 3, totalCents: 870 },
    });
    expect(
      eventForApiCall({
        method: "PATCH",
        path: "/v1/cart/items/i1",
        status: 200,
        requestBody: { quantity: 4 },
        responseBody: cart,
      })?.name,
    ).toBe("cart.item_updated");
    expect(
      eventForApiCall({
        method: "DELETE",
        path: "/v1/cart/items/i1",
        status: 200,
        responseBody: cart,
      }),
    ).toEqual({
      name: "cart.item_removed",
      properties: { itemId: "i1", itemCount: 3, totalCents: 870 },
    });
    expect(
      eventForApiCall({ method: "POST", path: "/v1/cart/merge", status: 200, responseBody: cart }),
    ).toEqual({ name: "cart.merged", properties: { itemCount: 3, totalCents: 870, merged: true } });
  });

  it("suit l'échec d'un ajout et d'une connexion avec le code d'erreur, jamais le message", () => {
    expect(
      eventForApiCall({
        method: "POST",
        path: "/v1/cart/items",
        status: 409,
        requestBody: { variantId: "v9", quantity: 1 },
        responseBody: { code: "VARIANT_OUT_OF_STOCK", message: "Stock insuffisant" },
      }),
    ).toEqual({
      name: "cart.add_failed",
      properties: { variantId: "v9", code: "VARIANT_OUT_OF_STOCK" },
    });
    expect(
      eventForApiCall({
        method: "POST",
        path: "/v1/auth/sign-in/email",
        status: 401,
        requestBody: { email: "camille@exemple.fr", password: "x" },
        responseBody: { code: "INVALID_EMAIL_OR_PASSWORD" },
      }),
    ).toEqual({
      name: "auth.login_failed",
      properties: { method: "email", code: "INVALID_EMAIL_OR_PASSWORD" },
    });
  });

  it("compte : seuls les noms des champs modifiés partent, pas leurs valeurs", () => {
    const event = eventForApiCall({
      method: "PATCH",
      path: "/v1/account/me",
      status: 200,
      requestBody: { lastName: "Martin", phone: "0612345678" },
    });
    expect(event).toEqual({
      name: "account.profile_updated",
      properties: { fields: ["lastName", "phone"] },
    });
    expect(JSON.stringify(event)).not.toContain("Martin");
    expect(JSON.stringify(event)).not.toContain("0612");
  });

  it("une adresse ajoutée ne transporte que son statut par défaut", () => {
    const event = eventForApiCall({
      method: "POST",
      path: "/v1/account/addresses",
      status: 201,
      responseBody: { id: "a1", isDefault: true, line1: "12 rue des Tanneurs", city: "Lyon" },
    });
    expect(event).toEqual({ name: "account.address_added", properties: { isDefault: true } });
  });

  it("back-office : actions sur les usagers et le catalogue", () => {
    expect(
      eventForApiCall({
        method: "POST",
        path: "/v1/admin/users/u1/suspend",
        status: 200,
        requestBody: { reason: "fraude" },
      }),
    ).toEqual({ name: "admin.user_suspended", properties: { userId: "u1" } });
    expect(
      eventForApiCall({
        method: "PUT",
        path: "/v1/admin/products/p1/options",
        status: 200,
        responseBody: { id: "p1", variants: [{}, {}, {}, {}] },
      }),
    ).toEqual({
      name: "admin.product_options_updated",
      properties: { productId: "p1", variantCount: 4 },
    });
    expect(
      eventForApiCall({ method: "DELETE", path: "/v1/admin/products/p1/image", status: 204 })
        ?.properties,
    ).toEqual({ productId: "p1", removed: true });
  });

  it("les lectures ordinaires et les échecs non suivis ne donnent rien", () => {
    expect(eventForApiCall({ method: "GET", path: "/v1/cart", status: 200 })).toBeNull();
    expect(
      eventForApiCall({ method: "GET", path: "/v1/catalog/products", status: 200 }),
    ).toBeNull();
    expect(eventForApiCall({ method: "PATCH", path: "/v1/account/me", status: 400 })).toBeNull();
  });

  it("retire toute clé personnelle d'une propriété", () => {
    expect(scrubProperties({ email: "a@b.fr", firstName: "A", productId: "p" })).toEqual({
      productId: "p",
    });
    expect(PERSONAL_KEYS).toContain("phone");
  });

  it("n'envoie rien sans client (pas de consentement)", () => {
    expect(() =>
      trackApiCall(null, {
        method: "POST",
        path: "/v1/cart/merge",
        status: 200,
        responseBody: cart,
      }),
    ).not.toThrow();
    const client = { capture: vi.fn() };
    trackApiCall(client, {
      method: "GET",
      path: "/v1/catalog/products/avoine",
      status: 200,
      responseBody: { id: "p1", slug: "avoine" },
    });
    expect(client.capture).toHaveBeenCalledWith("product.viewed", {
      productId: "p1",
      slug: "avoine",
    });
  });
});

describe("fetch rapporteur", () => {
  it("rapporte l'appel sans consommer la réponse, et rien sans consentement", async () => {
    const { withApiEvents } = await import("./index");
    const capture = vi.fn();
    let client: { capture: typeof capture } | null = null;
    const base = vi.fn(
      async () =>
        new Response(JSON.stringify({ itemCount: 1, totalCents: 290 }), {
          status: 201,
          headers: { "content-type": "application/json" },
        }),
    );
    const f = withApiEvents(base as unknown as typeof fetch, () => client);
    const init = { method: "POST", body: JSON.stringify({ variantId: "v1", quantity: 1 }) };
    const r1 = await f("/api/v1/cart/items", init);
    expect(await r1.json()).toEqual({ itemCount: 1, totalCents: 290 });
    await new Promise((r) => setTimeout(r, 0));
    expect(capture).not.toHaveBeenCalled();
    client = { capture };
    const r2 = await f("/api/v1/cart/items", init);
    expect((await r2.json()).itemCount).toBe(1);
    await new Promise((r) => setTimeout(r, 10));
    expect(capture).toHaveBeenCalledWith("cart.item_added", {
      variantId: "v1",
      quantity: 1,
      itemCount: 1,
      totalCents: 290,
    });
  });
});
