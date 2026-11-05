"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { errorCode } from "@/lib/api/http";
import type { Cart } from "@/lib/api/types";
import { useApi } from "@/providers/ApiProvider";

export const CART_KEY = ["cart"] as const;

/** Panier courant (invité par cookie, ou celui du compte). */
export function useCart() {
  const api = useApi();
  return useQuery({ queryKey: CART_KEY, queryFn: () => api.cart.get() });
}

function useCartMutation<V>(fn: (vars: V) => Promise<Cart>) {
  const client = useQueryClient();
  const t = useTranslations();
  return useMutation({
    mutationFn: fn,
    onSuccess: (cart) => client.setQueryData(CART_KEY, cart),
    onError: (error) => {
      const code = errorCode(error);
      toast.error(code === "VARIANT_OUT_OF_STOCK" ? t("common.outOfStock") : t("common.error"));
      void client.invalidateQueries({ queryKey: CART_KEY });
    },
  });
}

export function useAddToCart() {
  const api = useApi();
  return useCartMutation((v: { variantId: string; quantity: number }) => api.cart.add(v.variantId, v.quantity));
}

export function useUpdateCartItem() {
  const api = useApi();
  return useCartMutation((v: { itemId: string; quantity: number }) => api.cart.update(v.itemId, v.quantity));
}

export function useRemoveCartItem() {
  const api = useApi();
  return useCartMutation((itemId: string) => api.cart.remove(itemId));
}
