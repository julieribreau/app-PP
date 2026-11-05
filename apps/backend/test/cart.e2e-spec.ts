import { productVariant } from "@nutrion/db-schema";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { seedCatalog } from "../src/seed/seed-catalog";
import { Client, startApp } from "./app";
import { PASSWORD, signUpVerified } from "./helpers";

let ctx: Awaited<ReturnType<typeof startApp>>;
const variant = async (sku: string) =>
  (await ctx.db.select().from(productVariant).where(eq(productVariant.sku, sku)))[0]!.id;

beforeAll(async () => {
  ctx = await startApp();
  await seedCatalog(ctx.db);
});
afterAll(async () => {
  await ctx?.close();
});

describe("panier invité", () => {
  it("est vide sans jeton", async () => {
    const res = await new Client(ctx.base).req("GET", "/v1/cart");
    expect(res.json).toMatchObject({ id: null, items: [], itemCount: 0, totalCents: 0 });
  });

  it("crée le panier au premier ajout et renvoie le jeton en cookie et en en-tête", async () => {
    const web = new Client(ctx.base);
    const res = await web.req("POST", "/v1/cart/items", {
      variantId: await variant("AVC-CAC-U"),
      quantity: 2,
    });
    expect(res.status).toBe(201);
    const token = res.headers.get("x-cart-token");
    expect(token).toBeTruthy();
    expect(web.cookie("nutrion_cart")).toBe(token);
    expect(res.json).toMatchObject({
      itemCount: 2,
      subtotalCents: 580,
      totalCents: 580,
      vatCents: 30,
    });
    expect(res.json.items[0]).toMatchObject({
      productSlug: "avoine-cacao",
      variantLabel: "Cacao · À l'unité",
      unitPriceCents: 290,
      quantity: 2,
      lineTotalCents: 580,
      maxQuantity: 42,
    });

    // Le mobile n'a pas de cookie : le même panier par l'en-tête.
    const mobile = await new Client(ctx.base).req("GET", "/v1/cart", undefined, {
      "x-cart-token": token!,
    });
    expect(mobile.json.id).toBe(res.json.id);
  });
});

describe("stock et lignes", () => {
  it("refuse au-delà du stock et une variante épuisée ou désactivée", async () => {
    const web = new Client(ctx.base);
    expect(
      (
        await web.req("POST", "/v1/cart/items", {
          variantId: await variant("AVC-CAC-12"),
          quantity: 4,
        })
      ).json.code,
    ).toBe("VARIANT_OUT_OF_STOCK");
    expect(
      (
        await web.req("POST", "/v1/cart/items", {
          variantId: await variant("AVC-NOI-12"),
          quantity: 1,
        })
      ).json.code,
    ).toBe("VARIANT_OUT_OF_STOCK");
    expect(
      (
        await web.req("POST", "/v1/cart/items", {
          variantId: await variant("AVC-MYR-12"),
          quantity: 1,
        })
      ).json.code,
    ).toBe("VARIANT_NOT_FOUND");
  });

  it("modifie, plafonne au stock et retire une ligne", async () => {
    const web = new Client(ctx.base);
    const added = await web.req("POST", "/v1/cart/items", {
      variantId: await variant("CSL-12"),
      quantity: 1,
    });
    const itemId = added.json.items[0].id;
    expect(
      (await web.req("PATCH", `/v1/cart/items/${itemId}`, { quantity: 9 })).json.items[0].quantity,
    ).toBe(3);
    expect((await web.req("DELETE", `/v1/cart/items/${itemId}`)).json.items).toEqual([]);
  });

  it("retire à la lecture une variante devenue indisponible, et le signale", async () => {
    const web = new Client(ctx.base);
    const id = await variant("ELY-FRU");
    await web.req("POST", "/v1/cart/items", { variantId: id, quantity: 2 });
    await ctx.db.update(productVariant).set({ stock: 0 }).where(eq(productVariant.id, id));
    const res = await web.req("GET", "/v1/cart");
    expect(res.json.items).toEqual([]);
    expect(res.json.adjustments).toEqual([{ variantId: id, kind: "removed" }]);
    await ctx.db.update(productVariant).set({ stock: 2 }).where(eq(productVariant.id, id));
  });
});

describe("fusion à la connexion", () => {
  it("additionne les quantités, plafonne au stock et supprime le panier invité", async () => {
    const email = "fusion@exemple.fr";
    const account = await signUpVerified(ctx, email);
    await account.req("POST", "/v1/cart/items", {
      variantId: await variant("AVC-CAC-12"),
      quantity: 2,
    });

    const guest = new Client(ctx.base);
    await guest.req("POST", "/v1/cart/items", {
      variantId: await variant("AVC-CAC-12"),
      quantity: 2,
    });
    await guest.req("POST", "/v1/cart/items", { variantId: await variant("GFR"), quantity: 1 });
    const signIn = await guest.req("POST", "/v1/auth/sign-in/email", { email, password: PASSWORD });
    expect(signIn.status).toBe(200);

    const merged = await guest.req("POST", "/v1/cart/merge");
    expect(merged.status).toBe(200);
    expect(merged.json.merged).toBe(true);
    const lines = Object.fromEntries(
      merged.json.items.map((i: { productSlug: string; quantity: number }) => [
        i.productSlug,
        i.quantity,
      ]),
    );
    expect(lines).toEqual({ "avoine-cacao": 3, "granola-fruits-rouges": 1 });
    expect(merged.json.adjustments).toEqual([
      { variantId: await variant("AVC-CAC-12"), kind: "quantity_capped" },
    ]);
    expect(guest.cookie("nutrion_cart")).toBeUndefined();

    // Rejouer la fusion ne change rien.
    expect((await guest.req("POST", "/v1/cart/merge")).json).toMatchObject({
      merged: false,
      itemCount: 4,
    });
  });

  it("exige une session", async () => {
    expect((await new Client(ctx.base).req("POST", "/v1/cart/merge")).status).toBe(401);
  });
});
