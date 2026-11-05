"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { ErrorNote, Loading } from "@/components/ui/spinner";
import { Link } from "@/i18n/navigation";
import { errorCode } from "@/lib/api/http";
import type { ProductDetail } from "@/lib/api/types";
import { useApi } from "@/providers/ApiProvider";

import { BuyBox } from "./BuyBox";
import { ProductImage } from "./ProductImage";

function ProductBreadcrumb({ product }: { readonly product: ProductDetail }) {
  const t = useTranslations("product");
  const ts = useTranslations("shop");
  return (
    <nav
      aria-label={t("breadcrumb")}
      className="text-muted-foreground flex flex-wrap gap-2 text-sm"
    >
      <Link href="/boutique" className="hover:text-primary">
        {ts("title")}
      </Link>
      {product.category ? (
        <>
          <span aria-hidden="true">/</span>
          <Link href={`/boutique?category=${product.category.slug}`} className="hover:text-primary">
            {product.category.name}
          </Link>
        </>
      ) : null}
      <span aria-hidden="true">/</span>
      <span aria-current="page" className="text-foreground">
        {product.name}
      </span>
    </nav>
  );
}

/** Fiche produit : visuel, nom, prix, choix de la variante, description. */
export function ProductPage({ slug }: { readonly slug: string }) {
  const t = useTranslations("product");
  const ts = useTranslations("shop");
  const api = useApi();
  const {
    data: product,
    isPending,
    error,
    refetch,
  } = useQuery({
    queryKey: ["catalog", "product", slug],
    queryFn: () => api.catalog.product(slug),
  });
  if (isPending) return <Loading />;
  if (error) {
    return errorCode(error) === "PRODUCT_NOT_FOUND" ? (
      <main className="mx-auto max-w-[1280px] px-6 py-20 text-center md:px-12">
        <h1 className="display text-4xl">{t("notFound")}</h1>
        <Link href="/boutique" className="text-primary font-medium underline">
          {ts("title")}
        </Link>
      </main>
    ) : (
      <ErrorNote onRetry={() => void refetch()} />
    );
  }
  return (
    <main className="mx-auto flex max-w-[1280px] flex-col gap-6 px-6 pt-6 pb-20 md:px-12">
      <ProductBreadcrumb product={product} />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,440px),1fr))] items-start gap-14">
        <ProductImage
          name={product.name}
          imageUrl={product.imageUrl}
          categorySlug={product.category?.slug}
          seed={product.slug}
          className="aspect-square rounded-[24px]"
          fill="78%"
        />
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            {product.category ? <span className="eyebrow">{product.category.name}</span> : null}
            <h1 className="display m-0 text-[44px] leading-[48px]">{product.name}</h1>
            <p className="text-muted-foreground m-0 text-lg leading-7">{product.summary}</p>
          </div>
          <BuyBox key={product.id} product={product} />
          {product.descriptionHtml ? (
            <section className="border-border border-t pt-6">
              <h2 className="m-0 mb-2 text-base font-semibold">{t("description")}</h2>
              <div
                className="rich-text text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
              />
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}
