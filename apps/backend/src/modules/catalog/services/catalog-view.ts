import type { Locale } from "../../../common/locale";
import { localize } from "../../../common/locale";
import { isInStock, resolvePrice } from "../domain/pricing";
import { variantLabel, variantSummary } from "../domain/variants";
import type { ProductAggregate } from "../repositories/catalog.repository";

/** Vues publiques du catalogue (contrat d'API §Catalogue public), dans une langue. */
export function localizedOptions(agg: ProductAggregate, locale: Locale) {
  return agg.options.map((o) => ({
    id: o.id,
    name: localize(o.name, locale),
    values: o.values.map((v) => ({ id: v.id, label: localize(v.label, locale) })),
  }));
}

export function publicVariants(agg: ProductAggregate, locale: Locale) {
  const options = localizedOptions(agg, locale);
  return agg.variants
    .filter((v) => v.isActive)
    .map((v) => ({
      id: v.id,
      optionValues: v.optionValues,
      label: variantLabel(options, v.optionValues),
      priceCents: resolvePrice(v.priceCents, agg.product.priceCents),
      stock: v.stock,
      available: isInStock(v.stock),
    }));
}

export function productSummary(agg: ProductAggregate, locale: Locale, imageUrl: string | null) {
  const variants = publicVariants(agg, locale);
  const prices = variants.map((v) => v.priceCents);
  const priceFromCents = prices.length ? Math.min(...prices) : agg.product.priceCents;
  return {
    id: agg.product.id,
    slug: agg.product.slug,
    name: localize(agg.product.name, locale),
    summary: localize(agg.product.summary, locale),
    category: agg.category
      ? { slug: agg.category.slug, name: localize(agg.category.name, locale) }
      : null,
    imageUrl,
    priceFromCents,
    priceVaries: new Set(prices).size > 1,
    variantSummary: variantSummary(localizedOptions(agg, locale)),
    available: variants.some((v) => v.available),
  };
}

/** Fiche produit du back-office : textes dans toutes les langues, variantes même inactives. */
export function adminProductView(agg: ProductAggregate, imageUrl: string | null) {
  const frOptions = agg.options.map((o) => ({
    id: o.id,
    values: o.values.map((v) => ({ id: v.id, label: localize(v.label, "fr") })),
  }));
  return {
    id: agg.product.id,
    slug: agg.product.slug,
    categoryId: agg.product.categoryId,
    name: agg.product.name,
    summary: agg.product.summary,
    description: agg.product.description,
    priceCents: agg.product.priceCents,
    vatRateBps: agg.product.vatRateBps,
    status: agg.product.status,
    position: agg.product.position,
    imageUrl,
    options: agg.options.map((o) => ({
      id: o.id,
      name: o.name,
      values: o.values.map((v) => ({ id: v.id, label: v.label })),
    })),
    variants: agg.variants.map((v) => ({
      id: v.id,
      optionValues: v.optionValues,
      label: variantLabel(frOptions, v.optionValues),
      sku: v.sku,
      priceCents: v.priceCents,
      effectivePriceCents: resolvePrice(v.priceCents, agg.product.priceCents),
      stock: v.stock,
      isActive: v.isActive,
    })),
  };
}
