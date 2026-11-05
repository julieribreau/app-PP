import { describe, expect, it } from "vitest";

import { placeholderColors, placeholderKind } from "./placeholder";

describe("visuel de remplacement", () => {
  it("choisit la forme selon la catégorie", () => {
    expect(placeholderKind("barres-proteinees")).toBe("bar");
    expect(placeholderKind("granolas")).toBe("bag");
    expect(placeholderKind("boissons")).toBe("pot");
    expect(placeholderKind(null)).toBe("bar");
  });

  it("garde les mêmes couleurs pour un même produit", () => {
    expect(placeholderColors("avoine-cacao")).toEqual(placeholderColors("avoine-cacao"));
  });
});
