import { describe, expect, it } from "vitest";

import { capQuantity, cartTotals, mergeQuantities, reconcile } from "./cart-math";

describe("totaux du panier", () => {
  it("somme les lignes et calcule la TVA ligne par ligne", () => {
    const t = cartTotals([
      { unitPriceCents: 290, quantity: 2, vatRateBps: 550 },
      { unitPriceCents: 3490, quantity: 1, vatRateBps: 550 },
      { unitPriceCents: 790, quantity: 1, vatRateBps: 550 },
    ]);
    expect(t).toEqual({
      itemCount: 4,
      subtotalCents: 4860,
      totalCents: 4860,
      vatCents: 30 + 182 + 41,
    });
  });

  it("vide", () => {
    expect(cartTotals([])).toEqual({ itemCount: 0, subtotalCents: 0, totalCents: 0, vatCents: 0 });
  });
});

describe("fusion des paniers", () => {
  it("additionne et plafonne au stock", () => {
    const res = mergeQuantities(
      new Map([
        ["a", 2],
        ["b", 1],
      ]),
      new Map([
        ["a", 3],
        ["c", 4],
      ]),
      new Map<string, number | null>([
        ["a", 4],
        ["c", null],
      ]),
    );
    expect(res).toEqual([
      { variantId: "a", quantity: 4, capped: true },
      { variantId: "c", quantity: 4, capped: false },
    ]);
  });

  it("ignore une variante épuisée", () => {
    expect(mergeQuantities(new Map(), new Map([["a", 1]]), new Map([["a", 0]]))).toEqual([]);
  });
});

describe("réconciliation", () => {
  it("retire l'indisponible et plafonne le reste", () => {
    const r = reconcile([
      { itemId: "1", variantId: "a", quantity: 2, purchasable: false, stock: 10 },
      { itemId: "2", variantId: "b", quantity: 5, purchasable: true, stock: 3 },
      { itemId: "3", variantId: "c", quantity: 1, purchasable: true, stock: 0 },
      { itemId: "4", variantId: "d", quantity: 9, purchasable: true, stock: null },
    ]);
    expect(r.removals).toEqual(["1", "3"]);
    expect(r.updates).toEqual([{ itemId: "2", quantity: 3 }]);
    expect(r.adjustments).toEqual([
      { variantId: "a", kind: "removed" },
      { variantId: "b", kind: "quantity_capped" },
      { variantId: "c", kind: "removed" },
    ]);
  });

  it("capQuantity laisse l'illimité", () => {
    expect(capQuantity(99, null)).toBe(99);
  });
});
