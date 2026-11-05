import type { Meta, StoryObj } from "@storybook/react-vite";

import { ProductImage } from "@/components/shop/ProductImage";

// Visuel de remplacement tant que la photo manque : barre, sachet ou pot selon la catégorie.
const meta = {
  title: "Molecules/ProductImage",
  component: ProductImage,
  tags: ["autodocs"],
  args: {
    name: "Avoine & cacao",
    imageUrl: null,
    className: "aspect-[4/3] w-[320px] rounded-[24px]",
  },
} satisfies Meta<typeof ProductImage>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Bar: Story = { args: { categorySlug: "barres-cereales", seed: "avoine-cacao" } };
export const Bag: Story = { args: { categorySlug: "granolas", seed: "noisette" } };
export const Pot: Story = { args: { categorySlug: "boissons", seed: "cacao" } };
