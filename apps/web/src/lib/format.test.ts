import { describe, expect, it } from "vitest";

import { centsToInput, formatPrice, formatVatRate, parsePriceInput, priceExclVat } from "./format";

const nbsp = (s: string) => s.replace(/[\u00a0\u202f]/g, " ");

describe("format", () => {
  it("formate les centimes TTC en euros selon la langue", () => {
    expect(nbsp(formatPrice(290, "fr"))).toBe("2,90 €");
    expect(formatPrice(2990, "en")).toBe("€29.90");
  });

  it("formate le taux de TVA en points de base", () => {
    expect(nbsp(formatVatRate(550, "fr"))).toBe("5,5 %");
    expect(formatVatRate(2000, "en")).toBe("20%");
  });

  it("dérive le HT du TTC, arrondi au centime", () => {
    expect(priceExclVat(290, 550)).toBe(275);
    expect(priceExclVat(2990, 2000)).toBe(2492);
  });

  it("lit une saisie de prix, virgule ou point, et refuse l'illisible", () => {
    expect(parsePriceInput("2,90")).toBe(290);
    expect(parsePriceInput("2.9 €")).toBe(290);
    expect(parsePriceInput("")).toBeNull();
    expect(parsePriceInput("abc")).toBeNull();
    expect(centsToInput(290, "fr")).toBe("2,90");
    expect(centsToInput(null, "fr")).toBe("");
  });
});
