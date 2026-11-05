import * as React from "react";
import { AccessibilityInfo } from "react-native";

import { useAddToCart } from "@/hooks/cart/useCart";
import { ApiError } from "@/lib/api/client";
import {
  clampQuantity,
  findVariant,
  initialSelection,
  maxQuantity,
  selectValue,
  type Selection,
} from "@/lib/catalog/variant";
import { useI18n } from "@/lib/i18n/useI18n";
import type { ProductDetail } from "@/types/api";

/** État de la fiche produit : sélection des options → variante, quantité, ajout au panier. */
export function useProductPurchase(product: ProductDetail) {
  const { t, f } = useI18n();
  const addToCart = useAddToCart();
  const [selection, setSelection] = React.useState<Selection>(() => initialSelection(product));
  const [quantity, setQuantity] = React.useState(1);
  const [added, setAdded] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const variant = findVariant(product, selection);
  const max = maxQuantity(variant);
  const purchasable = Boolean(variant?.available) && max > 0;
  const qty = purchasable ? clampQuantity(quantity, max) : 1;
  const unitCents = variant?.priceCents ?? product.priceCents;

  const reset = () => {
    setAdded(false);
    setError(null);
  };

  const pick = (optionId: string, valueId: string) => {
    setSelection((current) => selectValue(product, current, optionId, valueId));
    setQuantity(1);
    reset();
  };

  const changeQuantity = (value: number) => {
    setQuantity(value);
    setAdded(false);
  };

  const add = () => {
    if (!variant) return;
    setError(null);
    addToCart.mutate(
      { variantId: variant.id, quantity: qty },
      {
        onSuccess: () => {
          setAdded(true);
          AccessibilityInfo.announceForAccessibility(
            f(t.product.added, { label: `${qty} × ${variant.label || product.name}` }),
          );
        },
        onError: (e) =>
          setError(
            e instanceof ApiError && e.code === "VARIANT_OUT_OF_STOCK"
              ? t.mobile.product.unavailableCombination
              : t.common.error,
          ),
      },
    );
  };

  return {
    selection,
    variant,
    max,
    purchasable,
    qty,
    totalCents: unitCents * qty,
    added,
    error,
    adding: addToCart.isPending,
    pick,
    changeQuantity,
    add,
  };
}
