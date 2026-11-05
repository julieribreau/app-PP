"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/cn";

const chip =
  "inline-flex h-10 min-w-10 cursor-pointer items-center justify-center rounded-full border border-input px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50";

/** Pages numérotées ; la page courante porte aria-current. */
export function Pagination({
  page,
  pageCount,
  onPage,
  label,
}: {
  readonly page: number;
  readonly pageCount: number;
  readonly onPage: (page: number) => void;
  readonly label: string;
}) {
  const t = useTranslations("common");
  if (pageCount <= 1) return null;
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);
  return (
    <nav aria-label={label} className="flex flex-wrap items-center justify-center gap-2">
      <button type="button" className={chip} disabled={page <= 1} onClick={() => onPage(page - 1)}>
        {t("previous")}
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          aria-current={p === page ? "page" : undefined}
          className={cn(chip, p === page && "border-foreground bg-foreground text-background")}
          onClick={() => onPage(p)}
        >
          {p}
        </button>
      ))}
      <button type="button" className={chip} disabled={page >= pageCount} onClick={() => onPage(page + 1)}>
        {t("next")}
      </button>
    </nav>
  );
}
