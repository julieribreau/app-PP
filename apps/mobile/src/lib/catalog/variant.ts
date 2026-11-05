import type { ProductDetail, ProductVariant } from "@/types/api";

// Choix d'une variante à partir des valeurs d'options choisies (brique facturation-paiement :
// on vend toujours une variante). Logique pure, testée sous Vitest.

export type Selection = Record<string, string>;

/** La variante dont la combinaison correspond exactement à la sélection. */
export function findVariant(
  product: Pick<ProductDetail, "options" | "variants">,
  selection: Selection,
) {
  return product.variants.find((variant) =>
    product.options.every((option) => variant.optionValues[option.id] === selection[option.id]),
  );
}

/**
 * Sélection de départ : la première variante disponible (sinon la première tout court), pour
 * ne jamais ouvrir une fiche sur une combinaison épuisée quand une autre se vend.
 */
export function initialSelection(product: Pick<ProductDetail, "options" | "variants">): Selection {
  const variant = product.variants.find((v) => v.available) ?? product.variants[0];
  if (!variant) return {};
  return Object.fromEntries(product.options.map((o) => [o.id, variant.optionValues[o.id] ?? ""]));
}

/**
 * Change une valeur d'option. Si la combinaison obtenue n'existe pas (désactivée au
 * back-office), on garde la nouvelle valeur et on complète avec la première variante qui la
 * porte, de préférence disponible.
 */
export function selectValue(
  product: Pick<ProductDetail, "options" | "variants">,
  selection: Selection,
  optionId: string,
  valueId: string,
): Selection {
  const next = { ...selection, [optionId]: valueId };
  if (findVariant(product, next)) return next;
  const candidates = product.variants.filter((v) => v.optionValues[optionId] === valueId);
  const fallback = candidates.find((v) => v.available) ?? candidates[0];
  if (!fallback) return next;
  return Object.fromEntries(product.options.map((o) => [o.id, fallback.optionValues[o.id] ?? ""]));
}

/** Une valeur est proposée si au moins une variante active la porte. */
export function valueExists(
  product: Pick<ProductDetail, "variants">,
  optionId: string,
  valueId: string,
): boolean {
  return product.variants.some((v) => v.optionValues[optionId] === valueId);
}

/** Quantité maximale achetable d'une variante (stock null = illimité, plafond d'usage 99). */
export function maxQuantity(variant: Pick<ProductVariant, "stock"> | undefined): number {
  if (!variant) return 0;
  return variant.stock === null ? 99 : Math.max(0, variant.stock);
}

export function clampQuantity(quantity: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(Math.max(1, Math.round(quantity)), max);
}
