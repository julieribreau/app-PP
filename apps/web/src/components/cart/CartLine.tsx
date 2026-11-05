"use client";

import { Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { ProductImage } from "@/components/shop/ProductImage";
import { QuantityStepper } from "@/components/shop/QuantityStepper";
import { Button } from "@/components/ui/button";
import { useRemoveCartItem, useUpdateCartItem } from "@/hooks/useCart";
import { Link } from "@/i18n/navigation";
import type { CartItem } from "@/lib/api/types";
import { formatPrice } from "@/lib/format";

/** Une ligne du panier : visuel, nom, variante, prix unitaire, quantité, total, retrait. */
export function CartLine({ item }: { readonly item: CartItem }) {
  const t = useTranslations("cart");
  const locale = useLocale();
  const update = useUpdateCartItem();
  const remove = useRemoveCartItem();
  return (
    <li className="border-border flex flex-wrap items-center gap-5 border-b py-5">
      <ProductImage
        name={item.productName}
        imageUrl={item.imageUrl}
        seed={item.productSlug}
        className="size-24 shrink-0 rounded-[14px]"
        fill="84%"
      />
      <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-1">
        <Link
          href={`/boutique/${item.productSlug}`}
          className="display hover:text-primary text-xl leading-[26px]"
        >
          {item.productName}
        </Link>
        {item.variantLabel ? (
          <span className="text-muted-foreground text-sm">{item.variantLabel}</span>
        ) : null}
        <span className="font-numeric text-muted-foreground text-sm">
          {t("unit", { price: formatPrice(item.unitPriceCents, locale) })}
        </span>
      </div>
      <QuantityStepper
        size="sm"
        value={item.quantity}
        max={item.maxQuantity ?? 99}
        label={t("quantityOf", { name: item.productName })}
        disabled={update.isPending}
        onChange={(quantity) => update.mutate({ itemId: item.id, quantity })}
      />
      <span className="font-numeric w-24 text-right text-lg font-medium">
        {formatPrice(item.lineTotalCents, locale)}
      </span>
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("remove", { name: item.productName })}
        onClick={() => remove.mutate(item.id)}
      >
        <Trash2 aria-hidden="true" strokeWidth={1.75} />
      </Button>
    </li>
  );
}
