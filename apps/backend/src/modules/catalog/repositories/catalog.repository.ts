import { Inject, Injectable } from "@nestjs/common";
import {
  cartItem,
  category,
  type Drizzle,
  product,
  productOption,
  productOptionValue,
  productVariant,
} from "@nutrion/db-schema";
import { and, asc, count, eq, inArray, type SQL } from "drizzle-orm";

import { DRIZZLE } from "../../db/db.module";
import { sortVariants } from "../domain/variants";

export type CategoryRow = typeof category.$inferSelect;
export type ProductRow = typeof product.$inferSelect;
export type OptionRow = typeof productOption.$inferSelect;
export type ValueRow = typeof productOptionValue.$inferSelect;
export type VariantRow = typeof productVariant.$inferSelect;

export type ProductAggregate = {
  product: ProductRow;
  category: CategoryRow | null;
  options: (OptionRow & { values: ValueRow[] })[];
  variants: VariantRow[];
};

/**
 * Accès au catalogue. Un produit se lit toujours entier (axes, valeurs, variantes) : le
 * catalogue est petit, quatre requêtes valent mieux qu'une jointure à plat à replier.
 */
@Injectable()
export class CatalogRepository {
  constructor(@Inject(DRIZZLE) readonly db: Drizzle) {}

  categories() {
    return this.db.select().from(category).orderBy(asc(category.position), asc(category.slug));
  }

  async categoryById(id: string) {
    const [row] = await this.db.select().from(category).where(eq(category.id, id)).limit(1);
    return row;
  }

  async productCountByCategory() {
    const rows = await this.db
      .select({ categoryId: product.categoryId, status: product.status, n: count() })
      .from(product)
      .groupBy(product.categoryId, product.status);
    return rows;
  }

  async loadProducts(where?: SQL): Promise<ProductAggregate[]> {
    const products = await this.db
      .select({ product, category })
      .from(product)
      .leftJoin(category, eq(category.id, product.categoryId))
      .where(where)
      .orderBy(asc(product.position), asc(product.createdAt));
    if (!products.length) return [];
    const ids = products.map((p) => p.product.id);
    const options = await this.db
      .select()
      .from(productOption)
      .where(inArray(productOption.productId, ids))
      .orderBy(asc(productOption.position));
    const values = options.length
      ? await this.db
          .select()
          .from(productOptionValue)
          .where(
            inArray(
              productOptionValue.optionId,
              options.map((o) => o.id),
            ),
          )
          .orderBy(asc(productOptionValue.position))
      : [];
    const variants = await this.db
      .select()
      .from(productVariant)
      .where(inArray(productVariant.productId, ids))
      .orderBy(asc(productVariant.createdAt), asc(productVariant.combinationKey));
    return products.map(({ product: p, category: c }) => {
      const productOptions = options
        .filter((o) => o.productId === p.id)
        .map((o) => ({ ...o, values: values.filter((v) => v.optionId === o.id) }));
      return {
        product: p,
        category: c,
        options: productOptions,
        variants: sortVariants(
          productOptions,
          variants.filter((v) => v.productId === p.id),
        ),
      };
    });
  }

  async loadProduct(where?: SQL): Promise<ProductAggregate | undefined> {
    return (await this.loadProducts(where))[0];
  }

  publicWhere(extra?: SQL) {
    return and(eq(product.status, "active"), eq(category.isActive, true), extra);
  }

  async slugExists(slug: string) {
    const [row] = await this.db
      .select({ id: product.id })
      .from(product)
      .where(eq(product.slug, slug))
      .limit(1);
    return Boolean(row);
  }

  /** Variantes du produit présentes dans au moins un panier. */
  async variantIdsInCarts(productId: string): Promise<Set<string>> {
    const rows = await this.db
      .selectDistinct({ id: cartItem.variantId })
      .from(cartItem)
      .innerJoin(productVariant, eq(productVariant.id, cartItem.variantId))
      .where(eq(productVariant.productId, productId));
    return new Set(rows.map((r) => r.id));
  }

  async isInAnyCart(productId: string) {
    const [row] = await this.db
      .select({ n: count() })
      .from(cartItem)
      .innerJoin(productVariant, eq(productVariant.id, cartItem.variantId))
      .where(eq(productVariant.productId, productId));
    return (row?.n ?? 0) > 0;
  }
}
