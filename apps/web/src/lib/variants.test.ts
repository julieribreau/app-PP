import { describe, expect, it } from "vitest";

import type { ProductDetail } from "./api/types";
import {
  findVariant,
  initialSelection,
  isValueOffered,
  maxQuantity,
  selectValue,
  selectionLabel,
} from "./variants";

const product = {
  id: "p1",
  slug: "avoine-cacao",
  name: "Avoine & cacao",
  summary: "",
  descriptionHtml: "",
  category: null,
  imageUrl: null,
  priceCents: 290,
  vatRateBps: 550,
  options: [
    {
      id: "o1",
      name: "Saveur",
      values: [
        { id: "cacao", label: "Cacao" },
        { id: "noisette", label: "Noisette" },
      ],
    },
    {
      id: "o2",
      name: "Format",
      values: [
        { id: "unit", label: "À l'unité" },
        { id: "box", label: "Boîte de 12" },
      ],
    },
  ],
  variants: [
    {
      id: "v1",
      optionValues: { o1: "cacao", o2: "unit" },
      label: "",
      priceCents: 290,
      stock: 0,
      available: false,
    },
    {
      id: "v2",
      optionValues: { o1: "cacao", o2: "box" },
      label: "",
      priceCents: 2990,
      stock: 3,
      available: true,
    },
    {
      id: "v3",
      optionValues: { o1: "noisette", o2: "unit" },
      label: "",
      priceCents: 290,
      stock: null,
      available: true,
    },
  ],
} satisfies ProductDetail;

describe("variants", () => {
  it("part de la première variante disponible", () => {
    expect(initialSelection(product)).toEqual({ o1: "cacao", o2: "box" });
  });

  it("trouve la variante d'une sélection complète, rien sinon", () => {
    expect(findVariant(product, { o1: "noisette", o2: "unit" })?.id).toBe("v3");
    expect(findVariant(product, { o1: "noisette" })).toBeUndefined();
  });

  it("bascule sur une combinaison existante quand l'autre axe ne suit pas", () => {
    // Noisette n'existe pas en boîte : la sélection passe à Noisette · À l'unité.
    expect(selectValue(product, { o1: "cacao", o2: "box" }, "o1", "noisette")).toEqual({
      o1: "noisette",
      o2: "unit",
    });
    expect(selectValue(product, { o1: "cacao", o2: "box" }, "o2", "unit")).toEqual({
      o1: "cacao",
      o2: "unit",
    });
  });

  it("indique si une valeur est en vente avec les autres axes choisis", () => {
    expect(isValueOffered(product, { o1: "cacao", o2: "box" }, "o2", "unit")).toBe(false);
    expect(isValueOffered(product, { o1: "noisette", o2: "unit" }, "o1", "cacao")).toBe(false);
    expect(isValueOffered(product, { o1: "cacao", o2: "unit" }, "o2", "box")).toBe(true);
  });

  it("plafonne la quantité au stock, 99 si illimité, 0 en rupture", () => {
    expect(maxQuantity(product.variants[1])).toBe(3);
    expect(maxQuantity(product.variants[2])).toBe(99);
    expect(maxQuantity(product.variants[0])).toBe(0);
    expect(maxQuantity(undefined)).toBe(0);
  });

  it("écrit le libellé des valeurs dans l'ordre des axes", () => {
    expect(selectionLabel(product, { o2: "box", o1: "cacao" })).toBe("Cacao · Boîte de 12");
  });
});
