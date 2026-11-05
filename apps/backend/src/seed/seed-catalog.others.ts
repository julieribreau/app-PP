// Données du seed : granolas, boissons, tartinables (fictives, plausibles).
import { ALLERGENES_AVOINE, desc, type SeedProduct } from "./seed-catalog.types";

export const OTHER_PRODUCTS: SeedProduct[] = [
  {
    slug: "granola-noisette-sarrasin",
    sku: "GNS",
    category: "granolas",
    name: { fr: "Granola noisette & sarrasin", en: "Hazelnut & buckwheat granola" },
    summary: {
      fr: "Gros clusters de sarrasin grillé et noisettes du Piémont.",
      en: "Big clusters of toasted buckwheat and Piedmont hazelnuts.",
    },
    description: desc(
      [
        "Un granola en gros morceaux, cuit lentement au four, peu sucré.",
        "<strong>Ingrédients :</strong> flocons d'avoine, sarrasin grillé (20 %), noisettes (15 %), sirop d'érable, huile de colza, cannelle.",
        ALLERGENES_AVOINE.fr,
      ],
      [
        "A chunky granola, slow-baked and lightly sweetened.",
        "<strong>Ingredients:</strong> oat flakes, toasted buckwheat (20%), hazelnuts (15%), maple syrup, rapeseed oil, cinnamon.",
        ALLERGENES_AVOINE.en,
      ],
    ),
    priceCents: 790,
    options: [
      {
        name: { fr: "Format", en: "Size" },
        values: [
          { code: "400", label: { fr: "Sachet de 400 g", en: "400 g bag" } },
          { code: "1K", label: { fr: "Sachet de 1 kg", en: "1 kg bag" } },
        ],
      },
    ],
    variants: { "400": { stock: 40 }, "1K": { priceCents: 1690, stock: 12 } },
  },
  {
    slug: "granola-fruits-rouges",
    sku: "GFR",
    category: "granolas",
    name: { fr: "Granola fruits rouges", en: "Red berry granola" },
    summary: {
      fr: "Framboise, cranberry et graines de courge, sachet de 400 g.",
      en: "Raspberry, cranberry and pumpkin seeds, 400 g bag.",
    },
    description: desc(
      [
        "Un granola croustillant aux fruits rouges lyophilisés.",
        "<strong>Ingrédients :</strong> flocons d'avoine, cranberries (10 %), framboises lyophilisées (4 %), graines de courge, miel, huile de tournesol.",
        ALLERGENES_AVOINE.fr,
      ],
      [
        "A crunchy granola with freeze-dried red berries.",
        "<strong>Ingredients:</strong> oat flakes, cranberries (10%), freeze-dried raspberries (4%), pumpkin seeds, honey, sunflower oil.",
        ALLERGENES_AVOINE.en,
      ],
    ),
    priceCents: 790,
    options: [],
    defaultStock: 30,
  },
  {
    slug: "granola-chocolat-coco",
    sku: "GCC",
    category: "granolas",
    name: { fr: "Granola chocolat & coco", en: "Chocolate & coconut granola" },
    summary: {
      fr: "Pépites de chocolat noir et copeaux de coco toastés.",
      en: "Dark chocolate chips and toasted coconut flakes.",
    },
    description: desc(
      [
        "Le granola gourmand du dimanche, au chocolat noir et à la noix de coco.",
        "<strong>Ingrédients :</strong> flocons d'avoine, chocolat noir (12 %), copeaux de coco (8 %), sucre de coco, huile de coco.",
        ALLERGENES_AVOINE.fr,
      ],
      [
        "The indulgent Sunday granola with dark chocolate and coconut.",
        "<strong>Ingredients:</strong> oat flakes, dark chocolate (12%), coconut flakes (8%), coconut sugar, coconut oil.",
        ALLERGENES_AVOINE.en,
      ],
    ),
    priceCents: 850,
    options: [
      {
        name: { fr: "Format", en: "Size" },
        values: [
          { code: "400", label: { fr: "Sachet de 400 g", en: "400 g bag" } },
          { code: "1K", label: { fr: "Sachet de 1 kg", en: "1 kg bag" } },
        ],
      },
    ],
    variants: { "400": { stock: 26 }, "1K": { priceCents: 1790, stock: 4 } },
  },
  {
    slug: "recuperation-cacao",
    sku: "RCA",
    category: "boissons",
    name: { fr: "Récupération cacao", en: "Cocoa recovery drink" },
    summary: {
      fr: "Boisson de récupération au cacao, pot de 500 g pour 20 doses.",
      en: "Cocoa recovery drink, 500 g tub for 20 servings.",
    },
    description: desc(
      [
        "Une poudre à mélanger à l'eau ou au lait après l'effort.",
        "<strong>Ingrédients :</strong> maltodextrine, protéines de lait, cacao maigre (12 %), sels minéraux.",
        "<strong>Allergènes :</strong> lait.",
      ],
      [
        "A powder to mix with water or milk after exercise.",
        "<strong>Ingredients:</strong> maltodextrin, milk proteins, fat-reduced cocoa (12%), mineral salts.",
        "<strong>Allergens:</strong> milk.",
      ],
    ),
    priceCents: 2490,
    options: [],
    defaultStock: 0, // produit entièrement en rupture : badge « Rupture »
  },
  {
    slug: "electrolytes",
    sku: "ELY",
    category: "boissons",
    name: { fr: "Électrolytes", en: "Electrolytes" },
    summary: {
      fr: "Étui de 10 sticks à diluer, pour les sorties longues.",
      en: "Box of 10 sticks to dilute, for long sessions.",
    },
    description: desc(
      [
        "Des sels minéraux à diluer dans 500 ml d'eau, peu sucrés.",
        "<strong>Ingrédients :</strong> dextrose, citrate de sodium, chlorure de potassium, magnésium, arôme naturel.",
      ],
      [
        "Mineral salts to dilute in 500 ml of water, lightly sweetened.",
        "<strong>Ingredients:</strong> dextrose, sodium citrate, potassium chloride, magnesium, natural flavouring.",
      ],
    ),
    priceCents: 990,
    options: [
      {
        name: { fr: "Saveur", en: "Flavour" },
        values: [
          { code: "CIT", label: { fr: "Citron", en: "Lemon" } },
          { code: "FRU", label: { fr: "Fruits rouges", en: "Red berries" } },
        ],
      },
    ],
    variants: { CIT: { stock: 50 }, FRU: { stock: 2 } },
  },
  {
    slug: "puree-cacahuete",
    sku: "PCA",
    category: "tartinables",
    name: { fr: "Purée de cacahuète", en: "Peanut butter" },
    summary: {
      fr: "100 % cacahuètes grillées, sans huile de palme ni sucre.",
      en: "100% roasted peanuts, no palm oil or sugar.",
    },
    description: desc(
      [
        "Une purée lisse, juste des cacahuètes grillées et broyées.",
        "<strong>Ingrédients :</strong> cacahuètes grillées (100 %).",
        "<strong>Allergènes :</strong> arachide.",
      ],
      [
        "A smooth butter, just roasted ground peanuts.",
        "<strong>Ingredients:</strong> roasted peanuts (100%).",
        "<strong>Allergens:</strong> peanuts.",
      ],
    ),
    priceCents: 650,
    options: [
      {
        name: { fr: "Format", en: "Size" },
        values: [
          { code: "250", label: { fr: "Pot de 250 g", en: "250 g jar" } },
          { code: "500", label: { fr: "Pot de 500 g", en: "500 g jar" } },
        ],
      },
    ],
    variants: { "250": { stock: 45 }, "500": { priceCents: 1190, stock: 20 } },
  },
  {
    slug: "puree-amande-complete",
    sku: "PAC",
    category: "tartinables",
    name: { fr: "Purée d'amande complète", en: "Whole almond butter" },
    summary: {
      fr: "Amandes entières avec la peau, pot de 250 g.",
      en: "Whole skin-on almonds, 250 g jar.",
    },
    description: desc(
      [
        "Une purée intense, aux amandes entières torréfiées.",
        "<strong>Ingrédients :</strong> amandes (100 %).",
        "<strong>Allergènes :</strong> fruits à coque.",
      ],
      [
        "An intense butter made from whole roasted almonds.",
        "<strong>Ingredients:</strong> almonds (100%).",
        "<strong>Allergens:</strong> tree nuts.",
      ],
    ),
    priceCents: 890,
    options: [],
    defaultStock: null,
  },
];
