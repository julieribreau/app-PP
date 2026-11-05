import { router } from "expo-router";
import * as React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { ErrorState, Loading } from "@/components/layout/Screen";
import { ProductImage } from "@/components/shop/ProductImage";
import { AppText } from "@/components/ui/AppText";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { useProduct } from "@/hooks/catalog/useCatalog";
import { useProductPurchase } from "@/hooks/catalog/useProductPurchase";
import { ApiError } from "@/lib/api/client";
import { valueExists, type Selection } from "@/lib/catalog/variant";
import { htmlToText } from "@/lib/format/format";
import { useI18n } from "@/lib/i18n/useI18n";
import { CART_ROUTE } from "@/lib/routes";
import { useTheme } from "@/theme/useTheme";
import type { ProductDetail } from "@/types/api";

// Fiche produit (canvas ProduitMobile) : image, catégorie, nom, prix TTC, choix des options →
// variante, description, et barre du bas quantité + « Ajouter au panier ».

export function ProductScreen({ slug }: { slug: string }) {
  const { color } = useTheme();
  const { t } = useI18n();
  const product = useProduct(slug);
  if (product.data) return <ProductView product={product.data} />;
  const notFound = product.error instanceof ApiError && product.error.status === 404;
  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: color.background }]}>
      {product.isLoading ? (
        <Loading />
      ) : (
        <>
          <BackButton />
          <ErrorState
            message={notFound ? t.product.notFound : undefined}
            onRetry={notFound ? undefined : () => void product.refetch()}
          />
        </>
      )}
    </SafeAreaView>
  );
}

function BackButton({ floating = false }: { floating?: boolean }) {
  const { color } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.mobile.product.back}
      onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
      style={[
        styles.back,
        { backgroundColor: color.card, borderColor: color.border },
        floating ? { position: "absolute", top: insets.top + 8, left: 16 } : { margin: 16 },
      ]}
    >
      <Icon name="chevronLeft" color={color.foreground} size={20} />
    </Pressable>
  );
}

export function ProductView({ product }: { product: ProductDetail }) {
  const { color } = useTheme();
  const { t, f } = useI18n();
  const insets = useSafeAreaInsets();
  const purchase = useProductPurchase(product);
  const description = htmlToText(product.descriptionHtml);
  const imageLabel = product.imageUrl
    ? f(t.product.imageAlt, { name: product.name })
    : t.product.imagePlaceholder;
  return (
    <View style={[styles.flex, { backgroundColor: color.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ProductImage
          imageUrl={product.imageUrl}
          slug={product.slug}
          categorySlug={product.category?.slug}
          accessibilityLabel={imageLabel}
          scale={0.7}
          style={{ height: 320 + insets.top, paddingTop: insets.top }}
        />
        <View style={styles.content}>
          <TitleBlock
            product={product}
            totalCents={purchase.totalCents}
            purchasable={purchase.purchasable}
          />
          <OptionPickers product={product} selection={purchase.selection} onPick={purchase.pick} />
          {product.summary ? <AppText variant="help">{product.summary}</AppText> : null}
          {description ? (
            <View style={[styles.description, { borderColor: color.border }]}>
              <AppText variant="bodyMedium" accessibilityRole="header">
                {t.product.description}
              </AppText>
              <AppText variant="small">{description}</AppText>
            </View>
          ) : null}
          {purchase.error ? (
            <AppText variant="help" tone="destructive" accessibilityLiveRegion="polite">
              {purchase.error}
            </AppText>
          ) : null}
        </View>
      </ScrollView>
      <BackButton floating />
      <PurchaseBar purchase={purchase} bottomInset={insets.bottom} />
    </View>
  );
}

function TitleBlock({
  product,
  totalCents,
  purchasable,
}: {
  product: ProductDetail;
  totalCents: number;
  purchasable: boolean;
}) {
  const { t, price } = useI18n();
  return (
    <View style={styles.titleBlock}>
      {product.category ? <AppText variant="overline">{product.category.name}</AppText> : null}
      <AppText variant="h1" accessibilityRole="header">
        {product.name}
      </AppText>
      <View
        style={styles.priceRow}
        accessible
        accessibilityLabel={`${price(totalCents)} ${t.common.ttc}`}
      >
        <AppText variant="priceLarge">{price(totalCents)}</AppText>
        <AppText variant="help">{t.common.ttc}</AppText>
        {purchasable ? null : <Badge label={t.common.outOfStock} />}
      </View>
    </View>
  );
}

function OptionPickers({
  product,
  selection,
  onPick,
}: {
  product: ProductDetail;
  selection: Selection;
  onPick: (optionId: string, valueId: string) => void;
}) {
  const { t, f } = useI18n();
  return (
    <>
      {product.options.map((option) => {
        const chosen = option.values.find((v) => v.id === selection[option.id]);
        const values = option.values.filter((value) => valueExists(product, option.id, value.id));
        return (
          <View key={option.id} style={styles.option}>
            <AppText variant="label">
              {chosen
                ? f(t.product.option, { name: option.name, value: chosen.label })
                : option.name}
            </AppText>
            <View
              style={styles.chips}
              accessibilityRole="radiogroup"
              accessibilityLabel={option.name}
            >
              {values.map((value) => (
                <Chip
                  key={value.id}
                  role="radio"
                  label={value.label}
                  selected={selection[option.id] === value.id}
                  onPress={() => onPick(option.id, value.id)}
                />
              ))}
            </View>
          </View>
        );
      })}
    </>
  );
}

function PurchaseBar({
  purchase,
  bottomInset,
}: {
  purchase: ReturnType<typeof useProductPurchase>;
  bottomInset: number;
}) {
  const { color } = useTheme();
  const { t } = useI18n();
  const label = !purchase.purchasable
    ? t.common.unavailable
    : purchase.added
      ? t.product.viewCart
      : t.product.addToCart;
  return (
    <View
      style={[
        styles.bottomBar,
        {
          backgroundColor: color.card,
          borderColor: color.border,
          paddingBottom: Math.max(bottomInset, 16),
        },
      ]}
    >
      <QuantityStepper
        value={purchase.qty}
        max={Math.max(1, purchase.max)}
        disabled={!purchase.purchasable}
        onChange={purchase.changeQuantity}
      />
      <Button
        testID="add-to-cart"
        style={styles.flex}
        label={label}
        disabled={!purchase.purchasable}
        loading={purchase.adding}
        onPress={purchase.added ? () => router.push(CART_ROUTE) : purchase.add}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingBottom: 24 },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { paddingHorizontal: 20, paddingTop: 20, gap: 18 },
  titleBlock: { gap: 4 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4, flexWrap: "wrap" },
  option: { gap: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  description: { gap: 6, borderTopWidth: 1, paddingTop: 14 },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
});
