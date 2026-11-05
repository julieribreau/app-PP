import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";

import { api, cartTokens } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query";
import { useI18n } from "@/lib/i18n/useI18n";
import { EMPTY_CART, type Cart } from "@/types/api";

// Panier (contrat §Panier) : chaque écriture renvoie le panier complet, qui remplace le cache.

export function useCart() {
  return useQuery({
    queryKey: queryKeys.cart,
    queryFn: async () => (await api.get<Cart>("/cart")) ?? EMPTY_CART,
    placeholderData: EMPTY_CART,
  });
}

/**
 * Noms de produits et libellés de variantes du panier arrivent dans la langue de la requête :
 * à un changement de langue, le panier est relu (il restait dans l'ancienne langue). La fusion
 * du panier invité est un fait de la connexion, que la relecture ne renvoie plus : on la garde,
 * sinon la note « panier invité ajouté » disparaissait quand le profil passe l'app en français.
 */
export function useCartFollowsLocale(): void {
  const { locale } = useI18n();
  const client = useQueryClient();
  const shown = React.useRef(locale);
  React.useEffect(() => {
    if (shown.current === locale) return;
    shown.current = locale;
    const merged = client.getQueryData<Cart>(queryKeys.cart)?.merged === true;
    void client.invalidateQueries({ queryKey: queryKeys.cart }).then(() => {
      if (merged) client.setQueryData<Cart>(queryKeys.cart, (cart) => cart && { ...cart, merged });
    });
  }, [locale, client]);
}

function useCartWrite<V>(write: (vars: V) => Promise<Cart>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: write,
    onSuccess: (cart) => client.setQueryData(queryKeys.cart, cart),
  });
}

export function useAddToCart() {
  return useCartWrite((vars: { variantId: string; quantity: number }) =>
    api.post<Cart>("/cart/items", vars),
  );
}

export function useUpdateCartItem() {
  return useCartWrite(({ itemId, quantity }: { itemId: string; quantity: number }) =>
    api.patch<Cart>(`/cart/items/${itemId}`, { quantity }),
  );
}

export function useRemoveCartItem() {
  return useCartWrite((itemId: string) => api.delete<Cart>(`/cart/items/${itemId}`));
}

/**
 * Après une connexion : fusionne le panier invité dans celui du compte puis oublie le jeton.
 * Sans jeton invité, relit simplement le panier du compte.
 */
export async function mergeGuestCart(): Promise<Cart> {
  const token = await cartTokens.get();
  const cart = token ? await api.post<Cart>("/cart/merge") : await api.get<Cart>("/cart");
  if (token) await cartTokens.clear();
  return cart ?? EMPTY_CART;
}
