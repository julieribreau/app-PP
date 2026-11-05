import { isInStock, vatFromTtc } from "../../catalog/domain/pricing";

export type PricedLine = { unitPriceCents: number; quantity: number; vatRateBps: number };

/** Totaux du panier : TVA calculée par ligne puis sommée (contrat d'API). */
export function cartTotals(lines: PricedLine[]) {
  let totalCents = 0;
  let vatCents = 0;
  let itemCount = 0;
  for (const l of lines) {
    const line = l.unitPriceCents * l.quantity;
    totalCents += line;
    vatCents += vatFromTtc(line, l.vatRateBps);
    itemCount += l.quantity;
  }
  return { itemCount, subtotalCents: totalCents, vatCents, totalCents };
}

/** Quantité plafonnée au stock (null = illimité), au moins 1 si le stock le permet. */
export function capQuantity(quantity: number, stock: number | null): number {
  return stock == null ? quantity : Math.min(quantity, stock);
}

export type ReconcileInput = {
  itemId: string;
  variantId: string;
  quantity: number;
  purchasable: boolean; // variante active d'un produit actif
  stock: number | null;
};

export type Adjustment = { variantId: string; kind: "removed" | "quantity_capped" };

/**
 * À chaque lecture : une variante archivée ou épuisée sort du panier, une quantité au-delà
 * du stock est ramenée au stock. Le client affiche `adjustments` une fois.
 */
export function reconcile(items: ReconcileInput[]) {
  const removals: string[] = [];
  const updates: { itemId: string; quantity: number }[] = [];
  const adjustments: Adjustment[] = [];
  for (const it of items) {
    if (!it.purchasable || !isInStock(it.stock)) {
      removals.push(it.itemId);
      adjustments.push({ variantId: it.variantId, kind: "removed" });
      continue;
    }
    const capped = capQuantity(it.quantity, it.stock);
    if (capped !== it.quantity) {
      updates.push({ itemId: it.itemId, quantity: capped });
      adjustments.push({ variantId: it.variantId, kind: "quantity_capped" });
    }
  }
  return { removals, updates, adjustments };
}

/**
 * Fusion du panier invité dans celui du compte : quantités additionnées par variante,
 * plafonnées au stock. Renvoie la quantité cible de chaque variante touchée.
 */
export function mergeQuantities(
  account: Map<string, number>,
  guest: Map<string, number>,
  stock: Map<string, number | null>,
): { variantId: string; quantity: number; capped: boolean }[] {
  const out: { variantId: string; quantity: number; capped: boolean }[] = [];
  for (const [variantId, q] of guest) {
    const wanted = (account.get(variantId) ?? 0) + q;
    const quantity = capQuantity(wanted, stock.get(variantId) ?? null);
    if (quantity > 0) out.push({ variantId, quantity, capped: quantity !== wanted });
  }
  return out;
}
