import { describe, expect, it } from "vitest";

import {
  formatMessage,
  formatPrice,
  formatRate,
  htmlToText,
  initials,
  pluralCategory,
} from "./format";

const nbsp = (s: string) => s.replace(/[\u00a0\u202f]/g, " ");

describe("formatPrice", () => {
  it("affiche les centimes TTC en euros, selon la langue", () => {
    expect(nbsp(formatPrice(290, "fr"))).toBe("2,90 €");
    expect(nbsp(formatPrice(4860, "en"))).toBe("€48.60");
  });
});

describe("formatRate", () => {
  it("affiche la TVA en pourcentage", () => {
    expect(nbsp(formatRate(550, "fr"))).toBe("5,5 %");
  });
});

describe("formatMessage", () => {
  it("remplace les variables", () => {
    expect(formatMessage("dès {price}", { price: "2,90 €" })).toBe("dès 2,90 €");
  });

  it("garde visible une variable absente", () => {
    expect(formatMessage("Bon retour, {name}")).toBe("Bon retour, {name}");
  });

  it("gère les pluriels ICU, =0 compris", () => {
    const t = "{count, plural, =0 {Aucun article} one {# article} other {# articles}}";
    expect(formatMessage(t, { count: 0 }, "fr")).toBe("Aucun article");
    expect(formatMessage(t, { count: 1 }, "fr")).toBe("1 article");
    expect(formatMessage(t, { count: 4 }, "fr")).toBe("4 articles");
  });

  it("applique les règles de pluriel de la langue", () => {
    const t = "{count, plural, one {# item} other {# items}}";
    expect(formatMessage(t, { count: 0 }, "en")).toBe("0 items");
    expect(
      formatMessage("{count, plural, one {# produit} other {# produits}}", { count: 0 }, "fr"),
    ).toBe("0 produit");
  });
});

describe("htmlToText", () => {
  it("rend une description assainie en texte lisible", () => {
    expect(htmlToText("<p>Avoine &amp; cacao</p><ul><li>Sans sucre</li><li>Fibres</li></ul>")).toBe(
      "Avoine & cacao\n• Sans sucre\n• Fibres",
    );
  });
});

describe("initials", () => {
  it("prend la première lettre du prénom et du nom, sinon de l'e-mail", () => {
    expect(initials("Camille", "Martin")).toBe("CM");
    expect(initials(null, null, "hugo@exemple.fr")).toBe("H");
  });
});

describe("pluralCategory sans Intl.PluralRules (Hermes)", () => {
  it("retombe sur les règles fr et en quand le moteur n'a pas PluralRules", () => {
    const original = Intl.PluralRules;
    // Hermes n'expose pas Intl.PluralRules : formatMessage plantait sur l'écran Boutique.
    (Intl as { PluralRules?: unknown }).PluralRules = undefined;
    try {
      expect(pluralCategory(0, "fr")).toBe("one");
      expect(pluralCategory(1, "fr")).toBe("one");
      expect(pluralCategory(12, "fr")).toBe("other");
      expect(pluralCategory(1, "en")).toBe("one");
      expect(pluralCategory(0, "en")).toBe("other");
      expect(
        formatMessage("{count, plural, one {# produit} other {# produits}}", { count: 12 }, "fr"),
      ).toBe("12 produits");
    } finally {
      (Intl as { PluralRules?: unknown }).PluralRules = original;
    }
  });
});
