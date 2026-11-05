import type { Meta, StoryObj } from "@storybook/react-vite";

import { ProductCard } from "@/components/shop/ProductCard";

const product = {
  id: "p1",
  slug: "avoine-cacao",
  name: "Avoine & cacao",
  summary: "Une barre moelleuse à l'avoine complète et au cacao.",
  category: { slug: "barres-cereales", name: "Barres céréales" },
  imageUrl: null,
  priceFromCents: 290,
  priceVaries: true,
  variantSummary: "3 saveurs · unité ou boîte de 12",
  available: true,
};

// Carte de la boutique : pas de badge de stock, sauf « Rupture ».
const meta = {
  title: "Molecules/ProductCard",
  component: ProductCard,
  tags: ["autodocs"],
  decorators: [(Story) => <div style={{ width: 280 }}><Story /></div>],
  args: { product },
} satisfies Meta<typeof ProductCard>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const OutOfStock: Story = { args: { product: { ...product, slug: "recup", name: "Récupération cacao", category: { slug: "boissons", name: "Boissons" }, priceFromCents: 2490, priceVaries: false, variantSummary: "Pot de 500 g", available: false } } };
