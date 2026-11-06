import { Inject, Injectable } from "@nestjs/common";
import { category, product } from "@nutrion/db-schema";
import { eq } from "drizzle-orm";

import { notFound } from "../../../common/app-error";
import { type Locale, localize } from "../../../common/locale";
import { paginate } from "../../../common/pagination";
import { STORAGE, type StoragePort } from "../../storage/storage.port";
import type { CatalogQueryDto } from "../dto/catalog.dto";
import { type ProductAggregate, CatalogRepository } from "../repositories/catalog.repository";
import { localizedOptions, productSummary, publicVariants } from "./catalog-view";

/** Catalogue public : produits actifs des catégories actives. */
@Injectable()
export class CatalogService {
  constructor(
    private readonly repo: CatalogRepository,
    @Inject(STORAGE) private readonly storage: StoragePort,
  ) {}

  imageUrl(key: string | null | undefined) {
    return key ? this.storage.signedUrl(key, 3600) : Promise.resolve(null);
  }

  async categories(locale: Locale) {
    const [cats, counts] = await Promise.all([
      this.repo.categories(),
      this.repo.productCountByCategory(),
    ]);
    // Une catégorie sans produit en vente (vide, ou seulement brouillons et archives) n'est pas
    // montrée : sa puce menait la boutique, site comme app, à une liste vide.
    return cats
      .filter((c) => c.isActive)
      .map((c) => ({
        id: c.id,
        slug: c.slug,
        name: localize(c.name, locale),
        productCount: counts
          .filter((n) => n.categoryId === c.id && n.status === "active")
          .reduce((s, n) => s + n.n, 0),
      }))
      .filter((c) => c.productCount > 0);
  }

  async list(q: CatalogQueryDto, locale: Locale) {
    const aggs = await this.repo.loadProducts(
      this.repo.publicWhere(q.category ? eq(category.slug, q.category) : undefined),
    );
    let items = await Promise.all(
      aggs.map(async (a) => ({
        a,
        view: productSummary(a, locale, await this.imageUrl(a.product.imageKey)),
      })),
    );
    if (q.q) {
      const needle = normalize(q.q);
      items = items.filter(({ a }) =>
        [a.product.name.fr, a.product.name.en, a.product.summary.fr, a.product.summary.en].some(
          (t) => t && normalize(t).includes(needle),
        ),
      );
    }
    const sorters: Record<
      string,
      (x: (typeof items)[number], y: (typeof items)[number]) => number
    > = {
      popular: (x, y) => x.a.product.position - y.a.product.position,
      price_asc: (x, y) => x.view.priceFromCents - y.view.priceFromCents,
      price_desc: (x, y) => y.view.priceFromCents - x.view.priceFromCents,
      new: (x, y) => y.a.product.createdAt.getTime() - x.a.product.createdAt.getTime(),
    };
    items.sort(sorters[q.sort]);
    return paginate(
      items.map((i) => i.view),
      q.page,
      q.pageSize,
    );
  }

  async detail(slug: string, locale: Locale) {
    const agg = await this.repo.loadProduct(this.repo.publicWhere(eq(product.slug, slug)));
    if (!agg) throw notFound("PRODUCT_NOT_FOUND", "Produit introuvable");
    return this.detailView(agg, locale);
  }

  async detailView(agg: ProductAggregate, locale: Locale) {
    const summary = productSummary(agg, locale, await this.imageUrl(agg.product.imageKey));
    return {
      id: summary.id,
      slug: summary.slug,
      name: summary.name,
      summary: summary.summary,
      descriptionHtml: localize(agg.product.description, locale),
      category: summary.category,
      imageUrl: summary.imageUrl,
      priceCents: agg.product.priceCents,
      vatRateBps: agg.product.vatRateBps,
      options: localizedOptions(agg, locale),
      variants: publicVariants(agg, locale),
    };
  }
}

const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
