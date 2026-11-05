import * as React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ProductImage } from "@/components/shop/ProductImage";
import { AppText } from "@/components/ui/AppText";
import { Badge } from "@/components/ui/Badge";
import { useI18n } from "@/lib/i18n/useI18n";
import { useTheme } from "@/theme/useTheme";
import type { ProductSummary } from "@/types/api";

// Carte d'un produit dans la grille de la boutique : image carrée, catégorie, nom, prix
// (« dès » s'il varie). Pas de badge de stock, sauf « Rupture » (ADR-002).

export interface ProductCardProps {
  product: ProductSummary;
  onPress?: () => void;
}

export function ProductCard({ product, onPress }: ProductCardProps) {
  const { color } = useTheme();
  const { t, f, price } = useI18n();
  const shownPrice = product.priceVaries
    ? f(t.common.priceFrom, { price: price(product.priceFromCents) })
    : price(product.priceFromCents);
  const label = [
    product.category?.name,
    product.name,
    shownPrice,
    product.available ? null : t.common.outOfStock,
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <Pressable
      testID={`product-${product.slug}`}
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: color.card, borderColor: color.border },
        pressed && { opacity: 0.85 },
      ]}
    >
      <ProductImage
        imageUrl={product.imageUrl}
        slug={product.slug}
        categorySlug={product.category?.slug}
        accessibilityLabel={product.name}
        style={styles.image}
      />
      <View
        style={styles.body}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        {product.category ? (
          <AppText variant="overline" numberOfLines={1}>
            {product.category.name}
          </AppText>
        ) : null}
        <AppText variant="title" numberOfLines={2}>
          {product.name}
        </AppText>
        <View style={styles.foot}>
          <AppText variant="price">{shownPrice}</AppText>
          {product.available ? null : <Badge label={t.common.outOfStock} />}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, borderWidth: 1, borderRadius: 20, overflow: "hidden" },
  image: { aspectRatio: 1 },
  body: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12, gap: 4 },
  foot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    marginTop: 4,
    flexWrap: "wrap",
  },
});
