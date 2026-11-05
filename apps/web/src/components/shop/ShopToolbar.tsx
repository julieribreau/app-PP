"use client";

import { useTranslations } from "next-intl";
import * as React from "react";

import { Input, Select } from "@/components/ui/input";
import type { Category, ProductSort } from "@/lib/api/types";
import { cn } from "@/lib/cn";

const SORTS: { value: ProductSort; key: "popular" | "priceAsc" | "priceDesc" | "new" }[] = [
  { value: "popular", key: "popular" },
  { value: "price_asc", key: "priceAsc" },
  { value: "price_desc", key: "priceDesc" },
  { value: "new", key: "new" },
];

/** Recherche (validée après une courte pause de frappe) et tri. */
export function ShopSearchSort({
  q,
  sort,
  onChange,
}: {
  readonly q: string;
  readonly sort: string;
  readonly onChange: (patch: { q?: string; sort?: string }) => void;
}) {
  const t = useTranslations("shop");
  const [text, setText] = React.useState(q);
  React.useEffect(() => setText(q), [q]);
  React.useEffect(() => {
    if (text === q) return;
    const id = setTimeout(() => onChange({ q: text }), 300);
    return () => clearTimeout(id);
  }, [text, q, onChange]);
  return (
    <form role="search" className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); onChange({ q: text }); }}>
      <div className="flex flex-col gap-1">
        <label htmlFor="shop-q" className="text-sm font-medium">{t("searchLabel")}</label>
        <Input id="shop-q" type="search" value={text} placeholder={t("searchPlaceholder")} onChange={(e) => setText(e.target.value)} className="w-[280px]" />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="shop-sort" className="text-sm font-medium">{t("sortLabel")}</label>
        <Select id="shop-sort" value={sort || "popular"} onChange={(e) => onChange({ sort: e.target.value === "popular" ? "" : e.target.value })} className="w-[200px]">
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>{t(`sort.${s.key}`)}</option>
          ))}
        </Select>
      </div>
    </form>
  );
}

/** Filtre par catégorie : boutons à bascule (aria-pressed). */
export function CategoryChips({
  categories,
  current,
  onChange,
}: {
  readonly categories: Category[];
  readonly current: string;
  readonly onChange: (slug: string) => void;
}) {
  const t = useTranslations("shop");
  const items = [{ slug: "", name: t("all") }, ...categories];
  return (
    <div role="group" aria-label={t("categories")} className="flex flex-wrap gap-2">
      {items.map((c) => {
        const on = c.slug === current;
        return (
          <button
            key={c.slug || "all"}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(c.slug)}
            className={cn(
              "h-10 cursor-pointer rounded-full border border-input px-[18px] text-sm font-medium",
              on && "border-foreground bg-foreground text-background",
            )}
          >
            {c.name}
          </button>
        );
      })}
    </div>
  );
}
