import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { StyleSheet, View } from "react-native";

import { ProductCard } from "@/components/shop/ProductCard";
import type { ProductSummary } from "@/types/api";

const base: ProductSummary = {
  id: "1",
  slug: "avoine-cacao",
  name: "Avoine & cacao",
  summary: "Une barre moelleuse à l'avoine complète et au cacao.",
  category: { slug: "barres-cereales", name: "Barres céréales" },
  imageUrl: null,
  priceFromCents: 290,
  priceVaries: true,
  variantSummary: "3 saveurs · 2 formats",
  available: true,
};

// Grille de la boutique (canvas BoutiqueMobile) : deux colonnes, « Rupture » seul badge.
function Grid() {
  return (
    <View style={styles.grid}>
      <View style={styles.cell}>
        <ProductCard product={base} />
      </View>
      <View style={styles.cell}>
        <ProductCard
          product={{
            ...base,
            id: "2",
            slug: "recuperation-cacao",
            name: "Récupération cacao",
            category: { slug: "boissons", name: "Boissons" },
            priceFromCents: 2490,
            priceVaries: false,
            available: false,
          }}
        />
      </View>
    </View>
  );
}

const meta = { title: "Mobile/Organisms/ProductCard", component: Grid } satisfies Meta<typeof Grid>;
export default meta;
export const Grille: StoryObj<typeof meta> = {};

const styles = StyleSheet.create({
  grid: { flexDirection: "row", gap: 12 },
  cell: { flex: 1 },
});
