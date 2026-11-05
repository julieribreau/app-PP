import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { seedCatalog } from "../src/seed/seed-catalog";
import { startApp } from "./app";

let ctx: Awaited<ReturnType<typeof startApp>>;

beforeAll(async () => {
  ctx = await startApp();
  await seedCatalog(ctx.db);
});
afterAll(async () => {
  await ctx?.close();
});

const get = async (path: string, locale = "fr") => {
  const res = await fetch(`${ctx.base}${path}`, { headers: { "accept-language": locale } });
  return { status: res.status, json: (await res.json()) as any }; // eslint-disable-line @typescript-eslint/no-explicit-any
};

describe("catalogue public", () => {
  it("liste les catégories actives avec leur nombre de produits", async () => {
    const { json } = await get("/v1/catalog/categories");
    expect(json.map((c: { slug: string }) => c.slug)).toEqual([
      "barres-cereales",
      "barres-proteinees",
      "granolas",
      "boissons",
      "tartinables",
    ]);
    // « Figue & noix » est en brouillon : pas compté.
    expect(json[0].productCount).toBe(2);
  });

  it("liste les produits actifs, prix minimal et disponibilité", async () => {
    const { json } = await get("/v1/catalog/products?pageSize=60");
    expect(json.total).toBe(12);
    const avoine = json.items.find((p: { slug: string }) => p.slug === "avoine-cacao");
    expect(avoine).toMatchObject({
      priceFromCents: 290,
      priceVaries: true,
      variantSummary: "3 saveurs · 2 formats",
      available: true,
    });
    expect(
      json.items.find((p: { slug: string }) => p.slug === "recuperation-cacao").available,
    ).toBe(false);
    expect(json.items.some((p: { slug: string }) => p.slug === "figue-noix")).toBe(false);
  });

  it("filtre par catégorie, cherche et trie", async () => {
    expect((await get("/v1/catalog/products?category=granolas")).json.total).toBe(3);
    expect((await get("/v1/catalog/products?q=creme")).json.total).toBe(0);
    expect(
      (await get("/v1/catalog/products?q=cacahuete")).json.items.map(
        (p: { slug: string }) => p.slug,
      ),
    ).toEqual(["cacahuete-sel", "puree-cacahuete"]);
    const asc = (await get("/v1/catalog/products?sort=price_asc&pageSize=60")).json.items.map(
      (p: { priceFromCents: number }) => p.priceFromCents,
    );
    expect(asc).toEqual([...asc].sort((a: number, b: number) => a - b));
  });

  it("rend la fiche d'un produit dans la langue demandée, variantes actives seules", async () => {
    const { json } = await get("/v1/catalog/products/avoine-cacao", "en");
    expect(json.name).toBe("Oat & cocoa");
    expect(json.options.map((o: { name: string }) => o.name)).toEqual(["Flavour", "Size"]);
    expect(json.variants).toHaveLength(5); // Myrtille × boîte est désactivée
    expect(
      json.variants.find((v: { label: string }) => v.label === "Cocoa · Box of 12"),
    ).toMatchObject({ priceCents: 2990, stock: 3, available: true });
    expect(
      json.variants.find((v: { label: string }) => v.label === "Hazelnut · Box of 12").available,
    ).toBe(false);
    expect(json.descriptionHtml).toContain("<strong>Ingredients:</strong>");
  });

  it("404 pour un produit inconnu ou en brouillon", async () => {
    expect((await get("/v1/catalog/products/figue-noix")).json).toMatchObject({
      statusCode: 404,
      code: "PRODUCT_NOT_FOUND",
    });
  });
});
