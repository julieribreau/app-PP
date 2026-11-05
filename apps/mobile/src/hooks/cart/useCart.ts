import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, cartTokens } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query";
import { EMPTY_CART, type Cart } from "@/types/api";

// Panier (contrat §Panier) : chaque écriture renvoie le panier complet, qui remplace le cache.

export function useCart() {
  return useQuery({
    queryKey: queryKeys.cart,
    queryFn: async () => (await api.get<Cart>("/cart")) ?? EMPTY_CART,
    placeholderData: EMPTY_CART,
  });
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
