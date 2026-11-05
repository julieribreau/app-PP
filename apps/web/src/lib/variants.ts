import type { ProductDetail, Variant } from "./api/types";

// Choix d'une variante à partir des valeurs d'options sélectionnées (une par axe). Le produit
// sans axe a une seule variante : la sélection vide la désigne.

export type Selection = Record<string, string>;

function matches(variant: Variant, selection: Selection): boolean {
  return Object.entries(selection).every(([optionId, valueId]) => variant.optionValues[optionId] === valueId);
}

/** La variante qui porte exactement ces valeurs, si elle est en vente. */
export function findVariant(product: ProductDetail, selection: Selection): Variant | undefined {
  if (Object.keys(selection).length < product.options.length) return undefined;
  return product.variants.find((variant) => matches(variant, selection));
}

/** Sélection de départ : la première variante disponible, à défaut la première tout court. */
export function initialSelection(product: ProductDetail): Selection {
  const first = product.variants.find((v) => v.available) ?? product.variants[0];
  return first ? { ...first.optionValues } : {};
}

/**
 * Choisir une valeur : on garde les autres axes si la combinaison existe, sinon on bascule sur
 * la première variante qui porte cette valeur.
 */
export function selectValue(product: ProductDetail, selection: Selection, optionId: string, valueId: string): Selection {
  const next = { ...selection, [optionId]: valueId };
  if (findVariant(product, next)) return next;
  const fallback = product.variants.find((v) => v.optionValues[optionId] === valueId);
  return fallback ? { ...fallback.optionValues } : next;
}

/** Une valeur existe-t-elle en vente, compte tenu des autres axes déjà choisis ? */
export function isValueOffered(product: ProductDetail, selection: Selection, optionId: string, valueId: string): boolean {
  const others = Object.fromEntries(Object.entries(selection).filter(([id]) => id !== optionId));
  return product.variants.some((v) => v.optionValues[optionId] === valueId && matches(v, others) && v.available);
}

/** Quantité maximale commandable (stock null = illimité, plafonné à 99 pour la saisie). */
export function maxQuantity(variant: Variant | undefined): number {
  if (!variant || !variant.available) return 0;
  return variant.stock === null ? 99 : Math.min(variant.stock, 99);
}

/** Libellé des valeurs choisies, dans l'ordre des axes (« Cacao · Boîte de 12 »). */
export function selectionLabel(product: ProductDetail, selection: Selection): string {
  return product.options
    .map((option) => option.values.find((v) => v.id === selection[option.id])?.label)
    .filter(Boolean)
    .join(" · ");
}
