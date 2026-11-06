"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import * as React from "react";

import { ProductImage } from "@/components/shop/ProductImage";
import { Pagination } from "@/components/shop/Pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { ErrorNote, Loading } from "@/components/ui/spinner";
import { useUrlState } from "@/hooks/useUrlState";
import { Link } from "@/i18n/navigation";
import type { AdminCategory, AdminProductRow, ProductStatus } from "@/lib/api/types";
import { formatPrice, formatVatRate } from "@/lib/format";
import { useApi } from "@/providers/ApiProvider";

import { AdminHeading } from "./AdminShell";
import { DataTable, type DataColumn } from "./DataTable";

const KEYS = ["q", "category", "status", "page"] as const;
export const STATUS_TONE = { active: "success", draft: "accent", archived: "muted" } as const;

function useColumns(locale: string): DataColumn<AdminProductRow>[] {
  const t = useTranslations("admin");
  return React.useMemo(
    () => [
      {
        id: "image",
        header: <span className="sr-only">{t("col.image")}</span>,
        cell: (p) => (
          <ProductImage
            name={p.name}
            imageUrl={p.imageUrl}
            categorySlug={p.category?.slug}
            seed={p.slug}
            className="size-11 rounded-[10px]"
            fill="90%"
          />
        ),
      },
      {
        id: "name",
        header: t("col.name"),
        cell: (p) => (
          <Link href={`/admin/produits/${p.id}`} className="hover:text-primary font-medium">
            {p.name}
          </Link>
        ),
      },
      { id: "category", header: t("col.category"), cell: (p) => p.category?.name ?? "—" },
      {
        id: "price",
        header: t("col.price"),
        align: "right",
        className: "font-numeric text-[13px]",
        cell: (p) => formatPrice(p.priceCents, locale),
      },
      {
        id: "vat",
        header: t("col.vat"),
        align: "right",
        className: "font-numeric text-[13px]",
        cell: (p) => formatVatRate(p.vatRateBps, locale),
      },
      {
        id: "variants",
        header: t("col.variants"),
        align: "right",
        className: "font-numeric text-[13px]",
        cell: (p) => p.variantCount,
      },
      {
        id: "stock",
        header: t("col.stock"),
        align: "right",
        className: "font-numeric text-[13px]",
        cell: (p) => (p.stockTotal === null ? t("unlimited") : p.stockTotal),
      },
      {
        id: "status",
        header: t("col.status"),
        cell: (p) => <Badge tone={STATUS_TONE[p.status]}>{t(`productStatus.${p.status}`)}</Badge>,
      },
    ],
    [t, locale],
  );
}

type UrlState = ReturnType<typeof useUrlState<(typeof KEYS)[number]>>;

function ProductFilters({
  state,
  set,
  categories,
}: {
  readonly state: UrlState[0];
  readonly set: UrlState[1];
  readonly categories: AdminCategory[];
}) {
  const t = useTranslations("admin");
  const locale = useLocale();
  return (
    <div role="search" className="flex flex-wrap items-center gap-2.5">
      <label htmlFor="products-q" className="sr-only">
        {t("searchProducts")}
      </label>
      <Input
        id="products-q"
        type="search"
        className="h-10 w-[260px]"
        placeholder={t("searchProducts")}
        defaultValue={state.q}
        onChange={(e) => set({ q: e.target.value })}
      />
      <label className="text-muted-foreground flex items-center gap-1.5 text-sm">
        {t("col.category")}
        <Select
          className="h-10 w-auto"
          value={state.category}
          onChange={(e) => set({ category: e.target.value })}
        >
          <option value="">{t("all")}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name[locale as "fr" | "en"] ?? c.name.fr}
            </option>
          ))}
        </Select>
      </label>
      <label className="text-muted-foreground flex items-center gap-1.5 text-sm">
        {t("status")}
        <Select
          className="h-10 w-auto"
          value={state.status}
          onChange={(e) => set({ status: e.target.value })}
        >
          <option value="">{t("all")}</option>
          {(["active", "draft", "archived"] as const).map((s) => (
            <option key={s} value={s}>
              {t(`productStatus.${s}`)}
            </option>
          ))}
        </Select>
      </label>
    </div>
  );
}

/** Catalogue du back-office : liste filtrable des produits. */
export function ProductsPage() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const api = useApi();
  const [state, set] = useUrlState(KEYS);
  const query = {
    q: state.q || undefined,
    category: state.category || undefined,
    status: (state.status || undefined) as ProductStatus | undefined,
    page: Math.max(1, Number(state.page) || 1),
    pageSize: 25,
  };
  const products = useQuery({
    queryKey: ["admin", "products", query],
    queryFn: () => api.admin.products(query),
    placeholderData: keepPreviousData,
  });
  const categories = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: () => api.admin.categories(),
  });
  const columns = useColumns(locale);
  return (
    <>
      <AdminHeading
        title={t("products")}
        sub={products.data ? t("productsCount", { count: products.data.total }) : undefined}
        actions={
          <Button asChild size="sm">
            <Link href="/admin/produits/nouveau">
              <Plus aria-hidden="true" />
              {t("newProduct")}
            </Link>
          </Button>
        }
      />
      <ProductFilters state={state} set={set} categories={categories.data ?? []} />
      {products.isPending ? (
        <Loading />
      ) : products.isError ? (
        <ErrorNote onRetry={() => void products.refetch()} />
      ) : (
        <DataTable
          rows={products.data.items}
          columns={columns}
          getRowId={(p) => p.id}
          caption={t("products")}
          minWidth={820}
        />
      )}
      {products.data ? (
        <Pagination
          page={products.data.page}
          pageCount={Math.ceil(products.data.total / products.data.pageSize)}
          onPage={(p) => set({ page: p }, false)}
          label={t("pagination")}
        />
      ) : null}
    </>
  );
}
