import {
  category,
  type Drizzle,
  product,
  productOption,
  productOptionValue,
  productVariant,
} from "@nutrion/db-schema";
import { eq } from "drizzle-orm";

import { combinationKey, combinations } from "../modules/catalog/domain/variants";
import { BAR_PRODUCTS } from "./seed-catalog.bars";
import { OTHER_PRODUCTS } from "./seed-catalog.others";
import type { SeedProduct } from "./seed-catalog.types";

export const CATEGORIES = [
  { slug: "barres-cereales", name: { fr: "Barres céréales", en: "Cereal bars" }, position: 0 },
  { slug: "barres-proteinees", name: { fr: "Barres protéinées", en: "Protein bars" }, position: 1 },
  { slug: "granolas", name: { fr: "Granolas", en: "Granolas" }, position: 2 },
  { slug: "boissons", name: { fr: "Boissons", en: "Drinks" }, position: 3 },
  { slug: "tartinables", name: { fr: "Tartinables", en: "Spreads" }, position: 4 },
];

export const PRODUCTS: SeedProduct[] = [...BAR_PRODUCTS, ...OTHER_PRODUCTS];

type Tx = Parameters<Parameters<Drizzle["transaction"]>[0]>[0];

/** Axes et valeurs d'un produit ; renvoie leur définition et le code de chaque valeur. */
async function insertOptions(tx: Tx, productId: string, sp: SeedProduct) {
  const codes = new Map<string, string>(); // valueId → code
  const defs: { id: string; values: { id: string }[] }[] = [];
  for (const [opos, o] of sp.options.entries()) {
    const [opt] = await tx
      .insert(productOption)
      .values({ productId, name: o.name, position: opos })
      .returning({ id: productOption.id });
    const values: { id: string }[] = [];
    for (const [vpos, v] of o.values.entries()) {
      const [val] = await tx
        .insert(productOptionValue)
        .values({ optionId: opt!.id, label: v.label, position: vpos })
        .returning({ id: productOptionValue.id });
      codes.set(val!.id, v.code);
      values.push({ id: val!.id });
    }
    defs.push({ id: opt!.id, values });
  }
  return { codes, defs };
}

function variantRow(productId: string, sp: SeedProduct, ov: Record<string, string>, code: string) {
  const conf = sp.variants?.[code] ?? {};
  return {
    productId,
    optionValues: ov,
    combinationKey: combinationKey(ov),
    sku: code ? `${sp.sku}-${code}` : sp.sku,
    priceCents: conf.priceCents ?? null,
    stock: conf.stock !== undefined ? conf.stock : (sp.defaultStock ?? null),
    isActive: conf.isActive ?? true,
  };
}

async function insertProduct(tx: Tx, sp: SeedProduct, categoryId: string, position: number) {
  const [prod] = await tx
    .insert(product)
    .values({
      slug: sp.slug,
      categoryId,
      name: sp.name,
      summary: sp.summary,
      description: sp.description,
      priceCents: sp.priceCents,
      vatRateBps: 550,
      status: sp.status ?? "active",
      position,
      // Étalés dans le temps : le tri « Nouveautés » a quelque chose à trier.
      createdAt: new Date(Date.UTC(2026, 9, 1 + position)),
    })
    .returning({ id: product.id });
  const { codes, defs } = await insertOptions(tx, prod!.id, sp);
  for (const ov of combinations(defs)) {
    const code = defs.map((d) => codes.get(ov[d.id]!)).join("-");
    await tx.insert(productVariant).values(variantRow(prod!.id, sp, ov, code));
  }
}

/** Catégories et produits : créés s'ils manquent (par slug), jamais écrasés. */
export async function seedCatalog(db: Drizzle) {
  const categoryIds = new Map<string, string>();
  for (const c of CATEGORIES) {
    await db.insert(category).values(c).onConflictDoNothing({ target: category.slug });
    const [row] = await db
      .select({ id: category.id })
      .from(category)
      .where(eq(category.slug, c.slug));
    categoryIds.set(c.slug, row!.id);
  }
  let created = 0;
  for (const [position, sp] of PRODUCTS.entries()) {
    const [exists] = await db
      .select({ id: product.id })
      .from(product)
      .where(eq(product.slug, sp.slug));
    if (exists) continue;
    await db.transaction((tx) => insertProduct(tx, sp, categoryIds.get(sp.category)!, position));
    created++;
  }
  return { categories: CATEGORIES.length, productsCreated: created };
}
