// Données du seed : barres céréales et protéinées (fictives, plausibles).
import { ALLERGENES_AVOINE, desc, type SeedProduct, unitBox } from "./seed-catalog.types";

export const BAR_PRODUCTS: SeedProduct[] = [
  {
    slug: "avoine-cacao",
    sku: "AVC",
    category: "barres-cereales",
    name: { fr: "Avoine & cacao", en: "Oat & cocoa" },
    summary: {
      fr: "Une barre moelleuse à l'avoine complète et au cacao.",
      en: "A soft wholegrain oat bar with cocoa.",
    },
    description: desc(
      [
        "Une barre moelleuse à l'avoine complète, pour la pause de 16 h ou l'avant-séance. Sans sucre ajouté : la douceur vient des dattes.",
        "<strong>Ingrédients :</strong> flocons d'avoine complète (52 %), dattes, purée d'amande, cacao maigre (6 %), huile de tournesol, sel.",
        ALLERGENES_AVOINE.fr,
      ],
      [
        "A soft wholegrain oat bar for your 4 pm break or before training. No added sugar: the sweetness comes from dates.",
        "<strong>Ingredients:</strong> wholegrain oat flakes (52%), dates, almond butter, fat-reduced cocoa (6%), sunflower oil, salt.",
        ALLERGENES_AVOINE.en,
      ],
    ),
    priceCents: 290,
    options: [
      {
        name: { fr: "Saveur", en: "Flavour" },
        values: [
          { code: "CAC", label: { fr: "Cacao", en: "Cocoa" } },
          { code: "NOI", label: { fr: "Noisette", en: "Hazelnut" } },
          { code: "MYR", label: { fr: "Myrtille", en: "Blueberry" } },
        ],
      },
      unitBox(),
    ],
    variants: {
      "CAC-U": { stock: 42 },
      "CAC-12": { priceCents: 2990, stock: 3 },
      "NOI-U": { stock: 18 },
      "NOI-12": { priceCents: 2990, stock: 0 },
      "MYR-U": { stock: 25 },
      "MYR-12": { priceCents: 2990, stock: 9, isActive: false },
    },
  },
  {
    slug: "amande-miel",
    sku: "AMI",
    category: "barres-cereales",
    name: { fr: "Amande & miel", en: "Almond & honey" },
    summary: {
      fr: "Croquante, à l'amande grillée et au miel de fleurs.",
      en: "Crunchy, with toasted almonds and wildflower honey.",
    },
    description: desc(
      [
        "Une barre croquante aux amandes grillées, liées au miel de fleurs français.",
        "<strong>Ingrédients :</strong> flocons d'avoine (45 %), amandes grillées (22 %), miel (15 %), sirop de riz, graines de lin, sel.",
        ALLERGENES_AVOINE.fr,
      ],
      [
        "A crunchy bar with toasted almonds bound with French wildflower honey.",
        "<strong>Ingredients:</strong> oat flakes (45%), toasted almonds (22%), honey (15%), rice syrup, flaxseed, salt.",
        ALLERGENES_AVOINE.en,
      ],
    ),
    priceCents: 290,
    options: [unitBox()],
    variants: { U: { stock: 80 }, "12": { priceCents: 2990, stock: 14 } },
  },
  {
    slug: "figue-noix",
    sku: "FNX",
    category: "barres-cereales",
    name: { fr: "Figue & noix", en: "Fig & walnut" },
    summary: {
      fr: "Recette d'automne, figue moelleuse et noix du Périgord.",
      en: "Autumn recipe with soft figs and Périgord walnuts.",
    },
    description: desc(
      [
        "Recette en préparation : figue moelleuse et noix du Périgord.",
        "<strong>Ingrédients :</strong> [Composition à finaliser]",
      ],
      [
        "Recipe in progress: soft figs and Périgord walnuts.",
        "<strong>Ingredients:</strong> [To be finalised]",
      ],
    ),
    priceCents: 310,
    status: "draft",
    options: [unitBox()],
    variants: { U: { stock: null }, "12": { priceCents: 3190, stock: null } },
  },
  {
    slug: "cacahuete-sel",
    sku: "CSL",
    category: "barres-proteinees",
    name: { fr: "Cacahuète & sel", en: "Peanut & sea salt" },
    summary: {
      fr: "20 g de protéines, cacahuète grillée et pointe de fleur de sel.",
      en: "20 g of protein, roasted peanuts and a touch of sea salt.",
    },
    description: desc(
      [
        "Une barre protéinée dense et salée, pensée pour la récupération après l'effort.",
        "<strong>Ingrédients :</strong> protéines de lait, cacahuètes grillées (25 %), sirop de chicorée, chocolat au lait, fleur de sel (0,4 %).",
        "<strong>Allergènes :</strong> arachide, lait, soja.",
      ],
      [
        "A dense, salty protein bar designed for post-workout recovery.",
        "<strong>Ingredients:</strong> milk proteins, roasted peanuts (25%), chicory syrup, milk chocolate, sea salt (0.4%).",
        "<strong>Allergens:</strong> peanuts, milk, soy.",
      ],
    ),
    priceCents: 340,
    options: [unitBox()],
    variants: { U: { stock: 60 }, "12": { priceCents: 3490, stock: 3 } },
  },
  {
    slug: "coco-chocolat-noir",
    sku: "CCN",
    category: "barres-proteinees",
    name: { fr: "Coco & chocolat noir", en: "Coconut & dark chocolate" },
    summary: {
      fr: "18 g de protéines végétales, noix de coco et chocolat noir 70 %.",
      en: "18 g of plant protein, coconut and 70% dark chocolate.",
    },
    description: desc(
      [
        "Une barre végétale à la noix de coco, enrobée de chocolat noir 70 %.",
        "<strong>Ingrédients :</strong> protéines de pois et de riz, noix de coco râpée (20 %), chocolat noir 70 % (18 %), sirop d'agave, huile de coco.",
        "<strong>Allergènes :</strong> peut contenir des traces de fruits à coque.",
      ],
      [
        "A plant-based coconut bar coated in 70% dark chocolate.",
        "<strong>Ingredients:</strong> pea and rice protein, desiccated coconut (20%), 70% dark chocolate (18%), agave syrup, coconut oil.",
        "<strong>Allergens:</strong> may contain traces of tree nuts.",
      ],
    ),
    priceCents: 340,
    options: [unitBox()],
    variants: { U: { stock: 35 }, "12": { priceCents: 3490, stock: 8 } },
  },
  {
    slug: "vanille-amande",
    sku: "VAM",
    category: "barres-proteinees",
    name: { fr: "Vanille & amande", en: "Vanilla & almond" },
    summary: {
      fr: "Douce et ronde, vanille de Madagascar et éclats d'amande.",
      en: "Smooth, with Madagascar vanilla and almond pieces.",
    },
    description: desc(
      [
        "Une barre protéinée douce, à la vanille de Madagascar.",
        "<strong>Ingrédients :</strong> protéines de lait, amandes (18 %), fibres de chicorée, beurre de cacao, extrait de vanille.",
        "<strong>Allergènes :</strong> lait, fruits à coque.",
      ],
      [
        "A smooth protein bar with Madagascar vanilla.",
        "<strong>Ingredients:</strong> milk proteins, almonds (18%), chicory fibre, cocoa butter, vanilla extract.",
        "<strong>Allergens:</strong> milk, tree nuts.",
      ],
    ),
    priceCents: 340,
    options: [unitBox()],
    variants: { U: { stock: 22 }, "12": { priceCents: 3490, stock: 5 } },
  },
];
