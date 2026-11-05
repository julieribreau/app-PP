"use client";

import { useLocale, useTranslations } from "next-intl";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAddToCart } from "@/hooks/useCart";
import { Link } from "@/i18n/navigation";
import type { ProductDetail } from "@/lib/api/types";
import { formatPrice, formatVatRate } from "@/lib/format";
import { findVariant, initialSelection, maxQuantity, selectValue, selectionLabel } from "@/lib/variants";

import { QuantityStepper } from "./QuantityStepper";
import { VariantPicker } from "./VariantPicker";

/** Choix de la variante, quantité plafonnée au stock et ajout au panier (annoncé, RGAA 7.5). */
export function BuyBox({ product }: { readonly product: ProductDetail }) {
  const t = useTranslations("product");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [selection, setSelection] = React.useState(() => initialSelection(product));
  const [qty, setQty] = React.useState(1);
  const [added, setAdded] = React.useState<string | null>(null);
  const add = useAddToCart();
  const variant = findVariant(product, selection);
  const max = maxQuantity(variant);
  const quantity = Math.max(1, Math.min(qty, max || 1));
  const unit = variant?.priceCents ?? product.priceCents;

  const onSelect = (optionId: string, valueId: string) => {
    setSelection((s) => selectValue(product, s, optionId, valueId));
    setQty(1);
    setAdded(null);
  };
  const onAdd = () => {
    if (!variant) return;
    const label = [`${quantity} ×`, selectionLabel(product, selection) || product.name].join(" ");
    add.mutate({ variantId: variant.id, quantity }, { onSuccess: () => setAdded(label) });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-numeric text-[32px] leading-10 font-medium">{formatPrice(unit * quantity, locale)}</span>
        <span className="text-sm text-muted-foreground">
          {tc("ttc")} · {tc("vatIncluded", { rate: formatVatRate(product.vatRateBps, locale) })}
        </span>
        {max === 0 ? <Badge tone="muted">{tc("outOfStock")}</Badge> : null}
      </div>
      <VariantPicker product={product} selection={selection} onSelect={onSelect} />
      <div className="flex flex-wrap items-center gap-3">
        <QuantityStepper value={quantity} max={max || 1} onChange={(v) => { setQty(v); setAdded(null); }} disabled={max === 0} />
        <Button size="lg" className="flex-[1_1_220px]" disabled={max === 0 || add.isPending} onClick={onAdd}>
          {max === 0 ? tc("unavailable") : t("addToCart")}
        </Button>
      </div>
      <div aria-live="polite" role="status">
        {added ? (
          <div className="flex items-center justify-between gap-3 rounded-[14px] bg-secondary px-4 py-3 text-secondary-foreground">
            <span>{t("added", { label: added })}</span>
            <Link href="/panier" className="font-semibold underline">{t("viewCart")}</Link>
          </div>
        ) : null}
      </div>
      <p className="m-0 text-sm text-muted-foreground">{t("payNote")}</p>
    </div>
  );
}
