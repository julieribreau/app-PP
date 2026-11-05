"use client";

import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import { ProductImage } from "@/components/shop/ProductImage";
import { Button } from "@/components/ui/button";
import type { AdminProduct } from "@/lib/api/types";
import { useApi } from "@/providers/ApiProvider";

/** Une photo par produit (JPG, PNG, WebP, 2 Mo) ; envoyée tout de suite sur le stockage objet. */
export function ProductImageCard({ product, onChange }: { readonly product: AdminProduct; readonly onChange: (p: AdminProduct) => void }) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const api = useApi();
  const input = React.useRef<HTMLInputElement>(null);
  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return void toast.error(t("imageHelp"));
    try {
      onChange(await api.admin.uploadImage(product.id, file));
    } catch {
      toast.error(tc("error"));
    }
  };
  return (
    <section aria-labelledby="pi-title" className="flex flex-[1_1_260px] flex-col gap-3.5 rounded-[18px] border border-border bg-card p-6">
      <h2 id="pi-title" className="m-0 text-[17px] leading-6 font-semibold">{t("image")}</h2>
      <ProductImage name={product.name.fr} imageUrl={product.imageUrl} seed={product.slug} className="aspect-square rounded-[14px]" fill="80%" />
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => void onFile(e.target.files?.[0])} />
      <Button variant="outline" size="sm" onClick={() => input.current?.click()}>{t("replaceImage")}</Button>
      {product.imageUrl ? <Button variant="ghost" size="sm" onClick={() => void api.admin.removeImage(product.id).then(onChange)}>{tc("delete")}</Button> : null}
      <span className="text-[13px] leading-[18px] text-muted-foreground">{t("imageHelp")}</span>
    </section>
  );
}
