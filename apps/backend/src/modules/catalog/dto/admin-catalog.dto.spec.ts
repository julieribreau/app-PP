import { describe, expect, it } from "vitest";

import { UpdateAddressDto } from "../../account/dto/account.dto";
import { CreateProductDto, UpdateCategoryDto, UpdateProductDto } from "./admin-catalog.dto";

// Régression : un PATCH partiel remettait statut, TVA, position, activation ou pays à leur
// valeur par défaut (les défauts de la création survivaient à `.partial()`).
describe("DTO de modification : aucune valeur par défaut", () => {
  it("produit : un PATCH de la seule description ne touche ni statut ni TVA", () => {
    const parsed = UpdateProductDto.schema.parse({ description: { fr: "<p>x</p>" } });
    expect(parsed).toEqual({ description: { fr: "<p>x</p>" } });
  });

  it("catégorie : renommer ne réactive ni ne déplace", () => {
    expect(UpdateCategoryDto.schema.parse({ name: { fr: "Barres" } })).toEqual({
      name: { fr: "Barres" },
    });
  });

  it("adresse : modifier la ville garde le pays", () => {
    expect(UpdateAddressDto.schema.parse({ city: "Lyon" })).toEqual({ city: "Lyon" });
  });

  it("la création garde ses défauts", () => {
    const created = CreateProductDto.schema.parse({
      categoryId: null,
      name: { fr: "Barre" },
      priceCents: 290,
    });
    expect(created).toMatchObject({ status: "draft", vatRateBps: 550, summary: { fr: "" } });
  });
});
