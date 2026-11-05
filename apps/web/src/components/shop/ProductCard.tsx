import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import type { ProductSummary } from "@/lib/api/types";

import { PriceTag } from "./PriceTag";
import { ProductImage } from "./ProductImage";

/**
 * Carte d'un produit dans la boutique : toute la carte mène à la fiche. Pas de badge de stock
 * (ADR-002), sauf « Rupture » qui empêche l'achat.
 */
export function ProductCard({
  product,
  headingLevel = 2,
}: {
  readonly product: ProductSummary;
  readonly headingLevel?: 2 | 3;
}) {
  const t = useTranslations("common");
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <Link
      href={`/boutique/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-[24px] border border-border bg-card text-card-foreground hover:text-card-foreground"
    >
      <ProductImage
        name={product.name}
        imageUrl={product.imageUrl}
        categorySlug={product.category?.slug}
        seed={product.slug}
        className="aspect-[4/3]"
      />
      <div className="flex flex-col gap-1.5 px-5 pt-4 pb-5">
        {product.category ? <span className="overline">{product.category.name}</span> : null}
        <Heading className="display m-0 text-[22px] leading-7 group-hover:text-primary">{product.name}</Heading>
        <span className="text-sm leading-5 text-muted-foreground">{product.variantSummary}</span>
        <div className="mt-2 flex items-center justify-between gap-2">
          <PriceTag cents={product.priceFromCents} from={product.priceVaries} />
          {product.available ? null : <Badge tone="muted">{t("outOfStock")}</Badge>}
        </div>
      </div>
    </Link>
  );
}
