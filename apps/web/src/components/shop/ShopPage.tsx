"use client";

import { keepPreviousData, useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import * as React from "react";

import { ErrorNote, Loading } from "@/components/ui/spinner";
import { useUrlState } from "@/hooks/useUrlState";
import type { Page, ProductSort, ProductSummary } from "@/lib/api/types";
import { useApi } from "@/providers/ApiProvider";

import { Pagination } from "./Pagination";
import { ProductCard } from "./ProductCard";
import { CategoryChips, ShopSearchSort } from "./ShopToolbar";

const KEYS = ["q", "category", "sort", "page"] as const;
const PAGE_SIZE = 24;

/** Boutique : recherche, tri, catégorie et page dans l'URL ; grille des produits. */
export function ShopPage() {
  const t = useTranslations("shop");
  const api = useApi();
  const [state, set] = useUrlState(KEYS);
  const page = Math.max(1, Number(state.page) || 1);
  const query = {
    q: state.q || undefined,
    category: state.category || undefined,
    sort: (state.sort || undefined) as ProductSort | undefined,
    page,
    pageSize: PAGE_SIZE,
  };
  const categories = useQuery({
    queryKey: ["catalog", "categories"],
    queryFn: () => api.catalog.categories(),
  });
  const products = useQuery({
    queryKey: ["catalog", "products", query],
    queryFn: () => api.catalog.products(query),
    placeholderData: keepPreviousData,
  });
  const onSearchSort = React.useCallback(
    (patch: { q?: string; sort?: string }) => set(patch),
    [set],
  );
  const total = products.data?.total ?? 0;

  return (
    <main className="mx-auto flex max-w-[1280px] flex-col gap-8 px-6 pt-10 pb-20 md:px-12">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-2">
          <span className="eyebrow" aria-live="polite">
            {products.data ? t("count", { count: total }) : " "}
          </span>
          <h1 className="display m-0 text-5xl leading-[52px]">{t("title")}</h1>
        </div>
        <ShopSearchSort q={state.q} sort={state.sort} onChange={onSearchSort} />
      </div>
      <CategoryChips
        categories={categories.data ?? []}
        current={state.category}
        onChange={(category) => set({ category })}
      />
      <ProductResults products={products} />
      <Pagination
        page={page}
        pageCount={Math.ceil(total / PAGE_SIZE)}
        onPage={(p) => set({ page: p }, false)}
        label={t("pagination")}
      />
    </main>
  );
}

function ProductResults({ products }: { readonly products: UseQueryResult<Page<ProductSummary>> }) {
  const t = useTranslations("shop");
  if (products.isPending) return <Loading />;
  if (products.isError) return <ErrorNote onRetry={() => void products.refetch()} />;
  if (!products.data.items.length)
    return <p className="text-muted-foreground py-12 text-center">{t("empty")}</p>;
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-6">
      {products.data.items.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
