import { describe, expect, it } from "vitest";

import type { ProductDetail } from "@/types/api";

import {
  clampQuantity,
  findVariant,
  initialSelection,
  maxQuantity,
  selectValue,
  valueExists,
} from "./variant";

const v = (
  id: string,
  [flavor, format]: [string, string],
  stock: number | null,
  available = stock !== 0,
) => ({
  id,
  optionValues: { saveur: flavor, format },
  label: `${flavor} · ${format}`,
  priceCents: format === "box" ? 2990 : 290,
  stock,
  available,
});

const product: Pick<ProductDetail, "options" | "variants"> = {
  options: [
    {
      id: "saveur",
      name: "Saveur",
      values: [
        { id: "cacao", label: "Cacao" },
        { id: "noisette", label: "Noisette" },
        { id: "myrtille", label: "Myrtille" },
      ],
    },
    {
      id: "format",
      name: "Format",
      values: [
        { id: "unit", label: "À l'unité" },
        { id: "box", label: "Boîte de 12" },
      ],
    },
  ],
  variants: [
    v("1", ["cacao", "unit"], 0),
    v("2", ["cacao", "box"], 3),
    v("3", ["noisette", "unit"], 18),
    v("4", ["noisette", "box"], null),
    // Myrtille n'existe qu'à l'unité (la boîte a été désactivée au back-office).
    v("5", ["myrtille", "unit"], 25),
  ],
};

describe("findVariant", () => {
  it("trouve la combinaison exacte", () => {
    expect(findVariant(product, { saveur: "noisette", format: "box" })?.id).toBe("4");
    expect(findVariant(product, { saveur: "myrtille", format: "box" })).toBeUndefined();
  });

  it("vend la variante unique d'un produit sans option", () => {
    const single = { options: [], variants: [{ ...v("9", ["", ""], null), optionValues: {} }] };
    expect(findVariant(single, {})?.id).toBe("9");
  });
});

describe("initialSelection", () => {
  it("ouvre la fiche sur la première variante disponible", () => {
    expect(initialSelection(product)).toEqual({ saveur: "cacao", format: "box" });
  });
});

describe("selectValue", () => {
  it("change une option quand la combinaison existe", () => {
    expect(selectValue(product, { saveur: "cacao", format: "box" }, "saveur", "noisette")).toEqual({
      saveur: "noisette",
      format: "box",
    });
  });

  it("complète avec une variante existante sinon", () => {
    expect(selectValue(product, { saveur: "cacao", format: "box" }, "saveur", "myrtille")).toEqual({
      saveur: "myrtille",
      format: "unit",
    });
  });
});

describe("valueExists", () => {
  it("ne propose que les valeurs portées par une variante active", () => {
    expect(valueExists(product, "saveur", "myrtille")).toBe(true);
    expect(valueExists(product, "saveur", "fraise")).toBe(false);
  });
});

describe("quantités", () => {
  it("plafonne au stock, 99 si illimité, 0 si épuisé", () => {
    expect(maxQuantity(product.variants[1])).toBe(3);
    expect(maxQuantity(product.variants[3])).toBe(99);
    expect(maxQuantity(product.variants[0])).toBe(0);
    expect(maxQuantity(undefined)).toBe(0);
  });

  it("borne la quantité entre 1 et le maximum", () => {
    expect(clampQuantity(5, 3)).toBe(3);
    expect(clampQuantity(0, 3)).toBe(1);
    expect(clampQuantity(2, 0)).toBe(0);
  });
});
