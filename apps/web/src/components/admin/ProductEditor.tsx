"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { AdminProduct } from "@/lib/api/types";
import { useApi } from "@/providers/ApiProvider";

import { AdminHeading } from "./AdminShell";
import { DeleteProductButton } from "./DeleteProductButton";
import { OptionsEditor } from "./OptionsEditor";
import { ProductImageCard } from "./ProductImageCard";
import { ProductMainFields } from "./ProductMainFields";
import { STATUS_TONE } from "./ProductsPage";
import { draftFrom, type Lang, newDraft, type ProductDraft, totalStock } from "./productDraft";
import { useProductSave } from "./useProductSave";
import { VariantsTable } from "./VariantsTable";

function VariantsSection({
  draft,
  lang,
  setDraft,
}: {
  readonly draft: ProductDraft;
  readonly lang: Lang;
  readonly setDraft: React.Dispatch<React.SetStateAction<ProductDraft>>;
}) {
  const t = useTranslations("admin");
  const stock = totalStock(draft.variants);
  return (
    <section
      aria-labelledby="pv-title"
      className="border-border bg-card flex flex-col gap-4 rounded-[18px] border p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="pv-title" className="m-0 text-[17px] leading-6 font-semibold">
          {t("variants")}
        </h2>
        <span className="text-muted-foreground text-[13px]">
          {t("variantsSummary", { count: draft.variants.length, stock: stock ?? t("unlimited") })}
        </span>
      </div>
      <OptionsEditor
        options={draft.options}
        lang={lang}
        onChange={(options) => setDraft((d) => ({ ...d, options }))}
      />
      <VariantsTable
        key={draft.variants.map((v) => v.id).join()}
        variants={draft.variants}
        onChange={(variants) => setDraft((d) => ({ ...d, variants }))}
      />
      <span className="text-muted-foreground text-[13px]">{t("variantsHelp")}</span>
    </section>
  );
}

function ProductBreadcrumb({ title }: { readonly title: string }) {
  const t = useTranslations("admin");
  return (
    <nav aria-label={t("breadcrumb")} className="text-muted-foreground flex gap-1.5 text-sm">
      <Link href="/admin/produits" className="hover:text-primary">
        {t("products")}
      </Link>
      <span aria-hidden="true">/</span>
      <span aria-current="page" className="text-foreground">
        {title}
      </span>
    </nav>
  );
}

/** Fiche produit du back-office (création si `product` est null). */
export function ProductEditor({ product: initial }: { readonly product: AdminProduct | null }) {
  const t = useTranslations("admin");
  const api = useApi();
  const [product, setProduct] = React.useState(initial);
  const [draft, setDraft] = React.useState<ProductDraft>(() =>
    initial ? draftFrom(initial) : newDraft(),
  );
  const [lang, setLang] = React.useState<Lang>("fr");
  const categories = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: () => api.admin.categories(),
  });
  const reset = (p: AdminProduct) => {
    setProduct(p);
    setDraft(draftFrom(p));
  };
  const save = useProductSave(product, reset);
  const title = draft.input.name.fr || t("newProduct");
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate(draft);
      }}
    >
      <ProductBreadcrumb title={title} />
      <AdminHeading
        title={
          <span className="inline-flex items-center gap-3">
            {title}
            {product ? (
              <Badge tone={STATUS_TONE[product.status]}>
                {t(`productStatus.${product.status}`)}
              </Badge>
            ) : null}
          </span>
        }
        actions={
          <>
            {product?.status === "active" ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/boutique/${product.slug}`}>{t("viewInShop")}</Link>
              </Button>
            ) : null}
            {product ? <DeleteProductButton productId={product.id} /> : null}
            <Button
              type="submit"
              size="sm"
              disabled={save.isPending || !draft.input.name.fr.trim()}
            >
              {t("save")}
            </Button>
          </>
        }
      />
      <div className="flex flex-wrap items-start gap-5">
        <ProductMainFields
          input={draft.input}
          categories={categories.data ?? []}
          lang={lang}
          onLang={setLang}
          onChange={(patch) => setDraft((d) => ({ ...d, input: { ...d.input, ...patch } }))}
        />
        {product ? <ProductImageCard product={product} onChange={reset} /> : null}
      </div>
      {product ? (
        <VariantsSection draft={draft} lang={lang} setDraft={setDraft} />
      ) : (
        <p className="text-muted-foreground m-0 text-sm">{t("variantsAfterCreate")}</p>
      )}
    </form>
  );
}

/** Chargement de la fiche par son identifiant. */
export function ProductEditorById({ id }: { readonly id: string }) {
  const api = useApi();
  const { data } = useQuery({
    queryKey: ["admin", "product", id],
    queryFn: () => api.admin.product(id),
  });
  return data ? <ProductEditor key={data.id} product={data} /> : null;
}
