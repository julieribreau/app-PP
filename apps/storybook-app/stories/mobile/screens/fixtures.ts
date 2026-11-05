import type { Address, Cart, Category, Me, Page, ProductDetail, ProductSummary } from "@/types/api";

// Données de démonstration des écrans (mêmes produits que le seed et le canvas validé).
export const categories: Category[] = [
  { id: "c1", slug: "barres-cereales", name: "Barres céréales", productCount: 2 },
  { id: "c2", slug: "barres-proteinees", name: "Barres protéinées", productCount: 2 },
  { id: "c3", slug: "granolas", name: "Granolas", productCount: 2 },
  { id: "c4", slug: "boissons", name: "Boissons", productCount: 1 },
];

const p = (
  [slug, name]: [string, string],
  category: Category,
  priceFromCents: number,
  flags: { varies?: boolean; available?: boolean } = {},
): ProductSummary => ({
  id: slug,
  slug,
  name,
  summary: "",
  category: { slug: category.slug, name: category.name },
  imageUrl: null,
  priceFromCents,
  priceVaries: flags.varies ?? true,
  variantSummary: "",
  available: flags.available ?? true,
});

const [cereales, proteinees, granolas, boissons] = categories as [
  Category,
  Category,
  Category,
  Category,
];

export const products: Page<ProductSummary> = {
  items: [
    p(["avoine-cacao", "Avoine & cacao"], cereales, 290),
    p(["amande-miel", "Amande & miel"], cereales, 290),
    p(["cacahuete-sel", "Cacahuète & sel"], proteinees, 340),
    p(["coco-chocolat", "Coco & chocolat noir"], proteinees, 340),
    p(["noisette-sarrasin", "Granola noisette & sarrasin"], granolas, 790),
    p(["recuperation-cacao", "Récupération cacao"], boissons, 2490, {
      varies: false,
      available: false,
    }),
  ],
  total: 6,
  page: 1,
  pageSize: 60,
};

export const product: ProductDetail = {
  id: "avoine-cacao",
  slug: "avoine-cacao",
  name: "Avoine & cacao",
  summary:
    "Une barre moelleuse à l'avoine complète et au cacao, pour la pause de 16 h ou l'avant-séance.",
  descriptionHtml: "<p>Flocons d'avoine complète, dattes, purée d'amande, cacao maigre.</p>",
  category: { slug: "barres-cereales", name: "Barres céréales" },
  imageUrl: null,
  priceCents: 290,
  vatRateBps: 550,
  options: [
    {
      id: "s",
      name: "Saveur",
      values: [
        { id: "cacao", label: "Cacao" },
        { id: "noisette", label: "Noisette" },
        { id: "myrtille", label: "Myrtille" },
      ],
    },
    {
      id: "f",
      name: "Format",
      values: [
        { id: "u", label: "À l'unité" },
        { id: "b", label: "Boîte de 12" },
      ],
    },
  ],
  variants: [
    {
      id: "1",
      optionValues: { s: "cacao", f: "u" },
      label: "Cacao · À l'unité",
      priceCents: 290,
      stock: 42,
      available: true,
    },
    {
      id: "2",
      optionValues: { s: "cacao", f: "b" },
      label: "Cacao · Boîte de 12",
      priceCents: 2990,
      stock: 3,
      available: true,
    },
    {
      id: "3",
      optionValues: { s: "noisette", f: "u" },
      label: "Noisette · À l'unité",
      priceCents: 290,
      stock: 18,
      available: true,
    },
    {
      id: "4",
      optionValues: { s: "noisette", f: "b" },
      label: "Noisette · Boîte de 12",
      priceCents: 2990,
      stock: 0,
      available: false,
    },
    {
      id: "5",
      optionValues: { s: "myrtille", f: "u" },
      label: "Myrtille · À l'unité",
      priceCents: 290,
      stock: 25,
      available: true,
    },
  ],
};

export const cart: Cart = {
  id: "cart",
  items: [
    {
      id: "i1",
      variantId: "1",
      productSlug: "avoine-cacao",
      productName: "Avoine & cacao",
      variantLabel: "Cacao · à l'unité",
      imageUrl: null,
      unitPriceCents: 290,
      quantity: 2,
      lineTotalCents: 580,
      maxQuantity: 42,
    },
    {
      id: "i2",
      variantId: "7",
      productSlug: "cacahuete-sel",
      productName: "Cacahuète & sel",
      variantLabel: "Boîte de 12",
      imageUrl: null,
      unitPriceCents: 3490,
      quantity: 1,
      lineTotalCents: 3490,
      maxQuantity: 3,
    },
    {
      id: "i3",
      variantId: "9",
      productSlug: "noisette-sarrasin",
      productName: "Granola noisette",
      variantLabel: "Sachet de 400 g",
      imageUrl: null,
      unitPriceCents: 790,
      quantity: 1,
      lineTotalCents: 790,
      maxQuantity: null,
    },
  ],
  itemCount: 4,
  subtotalCents: 4860,
  vatCents: 253,
  totalCents: 4860,
  adjustments: [],
  merged: false,
};

export const me: Me = {
  id: "u1",
  email: "camille.martin@exemple.fr",
  emailVerified: true,
  firstName: "Camille",
  lastName: "Martin",
  phone: "06 12 34 56 78",
  imageUrl: null,
  locale: "fr",
  theme: "system",
  role: "user",
  twoFactorEnabled: false,
  createdAt: "2026-10-04T09:00:00Z",
};

export const addresses: Address[] = [
  {
    id: "a1",
    label: "Maison",
    recipientName: "Camille Martin",
    line1: "12 rue des Tanneurs",
    line2: null,
    postalCode: "69007",
    city: "Lyon",
    countryCode: "FR",
    phone: null,
    isDefault: true,
  },
  {
    id: "a2",
    label: "Bureau",
    recipientName: "Camille Martin",
    line1: "48 cours Lafayette",
    line2: null,
    postalCode: "69003",
    city: "Lyon",
    countryCode: "FR",
    phone: null,
    isDefault: false,
  },
];
