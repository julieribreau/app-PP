// Types et briques communes des données du seed catalogue.
export type L = { fr: string; en: string };
export type SeedOption = { name: L; values: { label: L; code: string }[] };
export type SeedProduct = {
  slug: string;
  sku: string;
  category: string;
  name: L;
  summary: L;
  description: L;
  priceCents: number;
  status?: "draft" | "active" | "archived";
  options: SeedOption[];
  /** Par combinaison (codes des valeurs joints par « - », "" sans axe) : prix propre et stock. */
  variants?: Record<string, { priceCents?: number; stock?: number | null; isActive?: boolean }>;
  defaultStock?: number | null;
};

export const desc = (frParas: string[], enParas: string[]): L => ({
  fr: frParas.map((x) => `<p>${x}</p>`).join(""),
  en: enParas.map((x) => `<p>${x}</p>`).join(""),
});

export const unitBox = (): SeedOption => ({
  name: { fr: "Format", en: "Size" },
  values: [
    { code: "U", label: { fr: "À l'unité", en: "Single bar" } },
    { code: "12", label: { fr: "Boîte de 12", en: "Box of 12" } },
  ],
});

export const ALLERGENES_AVOINE = {
  fr: "<strong>Allergènes :</strong> avoine (gluten), fruits à coque. Traces possibles d'arachide et de sésame.",
  en: "<strong>Allergens:</strong> oats (gluten), tree nuts. May contain peanuts and sesame.",
};
