import { router } from "expo-router";
import * as React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { EmptyState, ErrorState, Note, Screen } from "@/components/layout/Screen";
import { ProductImage } from "@/components/shop/ProductImage";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { useSession } from "@/hooks/auth/useSession";
import { useCart, useRemoveCartItem, useUpdateCartItem } from "@/hooks/cart/useCart";
import { useI18n } from "@/lib/i18n/useI18n";
import { productRoute, SHOP_ROUTE, SIGN_IN_ROUTE } from "@/lib/routes";
import { useTheme } from "@/theme/useTheme";
import { EMPTY_CART, type Cart, type CartItem } from "@/types/api";

// Panier (canvas PanierMobile) : bandeau invité, lignes avec quantité, totaux TTC et TVA,
// bouton de paiement désactivé (« Paiement bientôt disponible »).

export function CartScreen() {
  const cart = useCart();
  if (cart.isError && !cart.data) {
    return (
      <Screen>
        <ErrorState onRetry={() => void cart.refetch()} />
      </Screen>
    );
  }
  const data = cart.data ?? EMPTY_CART;
  return (
    <Screen onRefresh={() => void cart.refetch()} refreshing={cart.isRefetching} footer={data.items.length > 0 ? <CheckoutBar /> : null}>
      <CartHeader count={data.itemCount} />
      <GuestNote />
      <CartNotes cart={data} />
      {data.items.length === 0 ? <EmptyCart /> : <CartContent cart={data} />}
    </Screen>
  );
}

function CartHeader({ count }: { count: number }) {
  const { t, f } = useI18n();
  return (
    <View style={styles.header}>
      <AppText variant="display" accessibilityRole="header">
        {t.cart.titleShort}
      </AppText>
      <AppText variant="help">{f(t.cart.items, { count })}</AppText>
    </View>
  );
}

function GuestNote() {
  const { t } = useI18n();
  const { data: session } = useSession();
  if (session?.user) return null;
  return (
    <Note>
      <AppText variant="small" tone="onSecondary">
        {t.mobile.cart.guestNote}{" "}
        <AppText variant="small" tone="onSecondary" accessibilityRole="link" onPress={() => router.push(SIGN_IN_ROUTE)} style={styles.link}>
          {t.mobile.cart.guestCta}
        </AppText>{" "}
        {t.mobile.cart.guestNoteEnd}
      </AppText>
    </Note>
  );
}

function CartNotes({ cart }: { cart: Cart }) {
  const { t } = useI18n();
  return (
    <>
      {cart.adjustments.length > 0 ? <Note>{t.cart.adjusted}</Note> : null}
      {cart.merged ? <Note>{t.cart.merged}</Note> : null}
    </>
  );
}

function EmptyCart() {
  const { t } = useI18n();
  return (
    <EmptyState
      message={t.cart.empty}
      action={<Button label={t.cart.emptyCta} variant="outline" onPress={() => router.navigate(SHOP_ROUTE)} />}
    />
  );
}

function CartContent({ cart }: { cart: Cart }) {
  const { color } = useTheme();
  const { t, price } = useI18n();
  const update = useUpdateCartItem();
  const remove = useRemoveCartItem();
  const busy = update.isPending || remove.isPending;
  return (
    <>
      <View style={[styles.list, { backgroundColor: color.card, borderColor: color.border }]}>
        {cart.items.map((item, index) => (
          <CartLine
            key={item.id}
            item={item}
            last={index === cart.items.length - 1}
            busy={busy}
            onQuantity={(quantity) => update.mutate({ itemId: item.id, quantity })}
            onRemove={() => remove.mutate(item.id)}
          />
        ))}
      </View>
      <View style={styles.totals}>
        <View style={styles.totalRow}>
          <AppText variant="help">{t.cart.vat}</AppText>
          <AppText variant="price" tone="muted">
            {price(cart.vatCents)}
          </AppText>
        </View>
        <View style={styles.totalRow} accessible accessibilityLabel={`${t.cart.total} ${price(cart.totalCents)}`}>
          <AppText variant="bodyStrong">{t.cart.total}</AppText>
          <AppText variant="priceLarge">{price(cart.totalCents)}</AppText>
        </View>
        <AppText variant="help">{t.cart.checkoutNote}</AppText>
      </View>
    </>
  );
}

function CheckoutBar() {
  const { color } = useTheme();
  const { t } = useI18n();
  return (
    <View style={[styles.footer, { borderColor: color.border, backgroundColor: color.background }]}>
      <Button testID="checkout" label={t.cart.checkout} disabled accessibilityHint={t.cart.checkoutNote} />
    </View>
  );
}

function CartLine({
  item,
  last,
  busy,
  onQuantity,
  onRemove,
}: {
  item: CartItem;
  last: boolean;
  busy: boolean;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
}) {
  const { color } = useTheme();
  const { price } = useI18n();
  return (
    <View style={[styles.line, !last && { borderBottomWidth: 1, borderBottomColor: color.border }]}>
      <Pressable accessibilityRole="link" accessibilityLabel={item.productName} onPress={() => router.push(productRoute(item.productSlug))}>
        <ProductImage imageUrl={item.imageUrl} slug={item.productSlug} accessibilityLabel={item.productName} style={styles.thumb} radius={12} scale={0.85} />
      </Pressable>
      <View style={styles.lineBody}>
        <AppText variant="title" numberOfLines={2}>
          {item.productName}
        </AppText>
        {item.variantLabel ? <AppText variant="help">{item.variantLabel}</AppText> : null}
        <View style={styles.lineFoot}>
          <QuantityStepper
            size="sm"
            value={item.quantity}
            max={item.maxQuantity ?? 99}
            itemName={item.productName}
            disabled={busy}
            onChange={onQuantity}
            onRemove={onRemove}
          />
          <AppText variant="price">{price(item.lineTotalCents)}</AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingHorizontal: 4 },
  link: { textDecorationLine: "underline", fontFamily: "DMSans_600SemiBold" },
  list: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14 },
  line: { flexDirection: "row", gap: 12, alignItems: "center", paddingVertical: 14 },
  thumb: { width: 64, height: 64 },
  lineBody: { flex: 1, gap: 2 },
  lineFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6, gap: 8 },
  totals: { gap: 6, paddingHorizontal: 4 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  footer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, borderTopWidth: 1 },
});
