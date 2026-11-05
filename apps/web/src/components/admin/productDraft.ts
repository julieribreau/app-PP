import type { AdminOption, AdminProduct, AdminProductInput, AdminVariant, Localized } from "@/lib/api/types";

// État d'édition d'un produit au back-office et ce qui en part vers l'API.

export type Lang = keyof Localized;
export const VAT_RATES = [550, 1000, 2000] as const;

export interface ProductDraft {
  input: AdminProductInput;
  options: AdminOption[];
  variants: AdminVariant[];
}

const empty: Localized = { fr: "", en: "" };

export function newDraft(): ProductDraft {
  return {
    input: { categoryId: null, name: { ...empty }, summary: { ...empty }, description: { ...empty }, priceCents: 0, vatRateBps: 550, status: "draft" },
    options: [],
    variants: [],
  };
}

export function draftFrom(product: AdminProduct): ProductDraft {
  const { categoryId, name, summary, description, priceCents, vatRateBps, status, slug } = product;
  return {
    input: { slug, categoryId, name, summary, description, priceCents, vatRateBps, status },
    options: product.options.map((o) => ({ ...o, values: o.values.map((v) => ({ ...v })) })),
    variants: product.variants.map((v) => ({ ...v })),
  };
}

/** Les variantes modifiées, avec seulement les champs éditables. */
export function changedVariants(before: AdminVariant[], after: AdminVariant[]): Partial<AdminVariant>[] {
  const old = new Map(before.map((v) => [v.id, v]));
  return after
    .filter((v) => {
      const o = old.get(v.id);
      return !o || o.isActive !== v.isActive || o.sku !== v.sku || o.priceCents !== v.priceCents || o.stock !== v.stock;
    })
    .map(({ id, isActive, sku, priceCents, stock }) => ({ id, isActive, sku, priceCents, stock }));
}

export function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Stock total affiché au-dessus du tableau ; null si une variante active est illimitée. */
export function totalStock(variants: AdminVariant[]): number | null {
  const active = variants.filter((v) => v.isActive);
  if (active.some((v) => v.stock === null)) return null;
  return active.reduce((sum, v) => sum + (v.stock ?? 0), 0);
}
