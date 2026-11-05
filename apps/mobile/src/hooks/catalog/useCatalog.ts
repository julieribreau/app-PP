import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query";
import { useI18n } from "@/lib/i18n/useI18n";
import type { Category, Page, ProductDetail, ProductSummary } from "@/types/api";

export function useCategories() {
  const { locale } = useI18n();
  return useQuery({
    queryKey: queryKeys.categories(locale),
    queryFn: () => api.get<Category[]>("/catalog/categories"),
  });
}

export function useProducts(category: string | null, q: string) {
  const { locale } = useI18n();
  return useQuery({
    queryKey: queryKeys.products(locale, category, q),
    queryFn: () => {
      const params = new URLSearchParams({ pageSize: "60" });
      if (category) params.set("category", category);
      if (q.trim()) params.set("q", q.trim());
      return api.get<Page<ProductSummary>>(`/catalog/products?${params.toString()}`);
    },
    placeholderData: (previous) => previous,
  });
}

export function useProduct(slug: string) {
  const { locale } = useI18n();
  return useQuery({
    queryKey: queryKeys.product(locale, slug),
    queryFn: () => api.get<ProductDetail>(`/catalog/products/${encodeURIComponent(slug)}`),
    enabled: slug.length > 0,
  });
}
