// Prix : un seul montant stocké, le TTC (prix de référence grand public, brique
// facturation-paiement). HT et TVA en sont dérivés, arrondis au centime.

/** Le prix d'une variante : le sien, sinon celui du produit. */
export const resolvePrice = (
  variantPriceCents: number | null | undefined,
  productPriceCents: number,
) => variantPriceCents ?? productPriceCents;

/** TVA contenue dans un montant TTC : ttc − round(ttc / (1 + taux)). */
export function vatFromTtc(ttcCents: number, vatRateBps: number): number {
  return ttcCents - htFromTtc(ttcCents, vatRateBps);
}

export function htFromTtc(ttcCents: number, vatRateBps: number): number {
  return Math.round((ttcCents * 10_000) / (10_000 + vatRateBps));
}

/** Achetable : stock illimité (null) ou strictement positif. */
export const isInStock = (stock: number | null | undefined) => stock == null || stock > 0;
