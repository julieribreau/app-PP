import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { StyleSheet, View } from "react-native";

import { ProductImage } from "@/components/shop/ProductImage";

// Visuel de remplacement tant que les photos n'existent pas : barre, sachet, pot.
function Images() {
  return (
    <View style={styles.row}>
      <ProductImage
        imageUrl={null}
        slug="avoine-cacao"
        categorySlug="barres-cereales"
        accessibilityLabel="Avoine & cacao"
        style={styles.tile}
        radius={20}
      />
      <ProductImage
        imageUrl={null}
        slug="noisette-sarrasin"
        categorySlug="granolas"
        accessibilityLabel="Granola noisette"
        style={styles.tile}
        radius={20}
      />
      <ProductImage
        imageUrl={null}
        slug="recuperation-cacao"
        categorySlug="boissons"
        accessibilityLabel="Récupération cacao"
        style={styles.tile}
        radius={20}
      />
    </View>
  );
}

const meta = { title: "Mobile/Molecules/ProductImage", component: Images } satisfies Meta<
  typeof Images
>;
export default meta;
export const Formes: StoryObj<typeof meta> = {};

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tile: { width: 160, height: 160 },
});
