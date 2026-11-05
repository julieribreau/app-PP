import { QueryClient } from "@tanstack/react-query";

import { ApiError } from "@/lib/api/client";

// Cache des lectures : 30 s de fraîcheur, pas de nouvel essai sur une erreur 4xx (le panier
// et le compte la montrent telle quelle).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2,
    },
  },
});

export const queryKeys = {
  categories: (locale: string) => ["categories", locale] as const,
  products: (locale: string, category: string | null, q: string) =>
    ["products", locale, category, q] as const,
  product: (locale: string, slug: string) => ["product", locale, slug] as const,
  cart: ["cart"] as const,
  me: ["me"] as const,
  addresses: ["addresses"] as const,
  sessions: ["sessions"] as const,
};
