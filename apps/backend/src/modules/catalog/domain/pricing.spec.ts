import { describe, expect, it } from "vitest";

import { htFromTtc, isInStock, resolvePrice, vatFromTtc } from "./pricing";

describe("prix", () => {
  it("hérite du prix du produit", () => {
    expect(resolvePrice(null, 290)).toBe(290);
    expect(resolvePrice(2990, 290)).toBe(2990);
  });

  it("dérive HT et TVA d'un TTC à 5,5 %", () => {
    expect(htFromTtc(290, 550)).toBe(275);
    expect(vatFromTtc(290, 550)).toBe(15);
    expect(vatFromTtc(3490, 550)).toBe(182);
  });

  it("à 20 %", () => {
    expect(htFromTtc(1200, 2000)).toBe(1000);
  });

  it("stock illimité ou positif", () => {
    expect(isInStock(null)).toBe(true);
    expect(isInStock(0)).toBe(false);
    expect(isInStock(3)).toBe(true);
  });
});
