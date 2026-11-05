import { Injectable } from "@nestjs/common";
import { product, productVariant } from "@nutrion/db-schema";
import { inArray } from "drizzle-orm";

import { conflict, notFound } from "../../../common/app-error";
import { type Locale, localize } from "../../../common/locale";
import { resolvePrice } from "../../catalog/domain/pricing";
import { variantLabel } from "../../catalog/domain/variants";
import {
  CatalogRepository,
  type ProductAggregate,
} from "../../catalog/repositories/catalog.repository";
import { CatalogService } from "../../catalog/services/catalog.service";
import {
  type Adjustment,
  capQuantity,
  cartTotals,
  mergeQuantities,
  reconcile,
} from "../domain/cart-math";
import { hashCartToken, newCartToken } from "../domain/cart-token";
import { CartRepository, type CartRow } from "../repositories/cart.repository";

/** Qui possède le panier : l'usager connecté, sinon le porteur du jeton invité. */
export type CartOwner = { userId: string | null; guestToken: string | null };

type ResolvedVariant = { agg: ProductAggregate; variant: ProductAggregate["variants"][number] };

@Injectable()
export class CartService {
  constructor(
    private readonly repo: CartRepository,
    private readonly catalog: CatalogRepository,
    private readonly catalogService: CatalogService,
  ) {}

  private async find(owner: CartOwner): Promise<CartRow | undefined> {
    if (owner.userId) return this.repo.byUser(owner.userId);
    if (owner.guestToken) return this.repo.byGuestHash(hashCartToken(owner.guestToken));
    return undefined;
  }

  /** Le panier, créé s'il manque. `issuedToken` : nouveau jeton invité à renvoyer au client. */
  private async findOrCreate(
    owner: CartOwner,
  ): Promise<{ cart: CartRow; issuedToken: string | null }> {
    const existing = await this.find(owner);
    if (existing) return { cart: existing, issuedToken: null };
    if (owner.userId)
      return { cart: await this.repo.createForUser(owner.userId), issuedToken: null };
    const token = newCartToken();
    return { cart: await this.repo.createForGuest(hashCartToken(token)), issuedToken: token };
  }

  private async variants(variantIds: string[]): Promise<Map<string, ResolvedVariant>> {
    if (!variantIds.length) return new Map();
    const productIds = await this.catalog.db
      .selectDistinct({ id: productVariant.productId })
      .from(productVariant)
      .where(inArray(productVariant.id, variantIds));
    const aggs = await this.catalog.loadProducts(
      inArray(
        product.id,
        productIds.map((p) => p.id),
      ),
    );
    const map = new Map<string, ResolvedVariant>();
    for (const agg of aggs)
      for (const variant of agg.variants) map.set(variant.id, { agg, variant });
    return map;
  }

  async get(owner: CartOwner, locale: Locale) {
    return this.view(await this.find(owner), locale);
  }

  async addItem(owner: CartOwner, variantId: string, quantity: number, locale: Locale) {
    const resolved = (await this.variants([variantId])).get(variantId);
    if (!resolved || !resolved.variant.isActive || resolved.agg.product.status !== "active") {
      throw notFound("VARIANT_NOT_FOUND", "Variante indisponible");
    }
    const { cart, issuedToken } = await this.findOrCreate(owner);
    const current =
      (await this.repo.items(cart.id)).find((i) => i.variantId === variantId)?.quantity ?? 0;
    const stock = resolved.variant.stock;
    if (stock != null && current + quantity > stock) {
      throw conflict(
        "VARIANT_OUT_OF_STOCK",
        stock === 0 ? "Rupture de stock" : `Plus que ${stock} en stock`,
      );
    }
    await this.repo.setQuantity(cart.id, variantId, current + quantity);
    return { cart: await this.view(cart, locale), issuedToken };
  }

  async updateItem(owner: CartOwner, itemId: string, quantity: number, locale: Locale) {
    const cart = await this.find(owner);
    const item = cart && (await this.repo.item(cart.id, itemId));
    if (!cart || !item) throw notFound("CART_ITEM_NOT_FOUND", "Article introuvable");
    const resolved = (await this.variants([item.variantId])).get(item.variantId);
    const capped = capQuantity(quantity, resolved?.variant.stock ?? null);
    if (capped <= 0) await this.repo.deleteItems([itemId]);
    else await this.repo.updateItem(itemId, capped);
    await this.repo.touch(cart.id);
    return this.view(cart, locale);
  }

  async removeItem(owner: CartOwner, itemId: string, locale: Locale) {
    const cart = await this.find(owner);
    const item = cart && (await this.repo.item(cart.id, itemId));
    if (!cart || !item) throw notFound("CART_ITEM_NOT_FOUND", "Article introuvable");
    await this.repo.deleteItems([itemId]);
    await this.repo.touch(cart.id);
    return this.view(cart, locale);
  }

  /** Fusion du panier invité dans celui du compte, juste après la connexion. */
  async merge(userId: string, guestToken: string | null, locale: Locale) {
    const guest = guestToken ? await this.repo.byGuestHash(hashCartToken(guestToken)) : undefined;
    if (!guest || guest.userId)
      return { ...(await this.get({ userId, guestToken: null }, locale)), merged: false };
    const guestItems = await this.repo.items(guest.id);
    const account = await this.repo.createForUser(userId);
    const accountItems = await this.repo.items(account.id);
    const resolved = await this.variants(guestItems.map((i) => i.variantId));
    const purchasable = guestItems.filter((i) => {
      const r = resolved.get(i.variantId);
      return r && r.variant.isActive && r.agg.product.status === "active";
    });
    const targets = mergeQuantities(
      new Map(accountItems.map((i) => [i.variantId, i.quantity])),
      new Map(purchasable.map((i) => [i.variantId, i.quantity])),
      new Map(
        purchasable.map((i) => [i.variantId, resolved.get(i.variantId)?.variant.stock ?? null]),
      ),
    );
    for (const t of targets) await this.repo.setQuantity(account.id, t.variantId, t.quantity);
    await this.repo.deleteCart(guest.id);
    const view = await this.view(account, locale);
    const capped: Adjustment[] = targets
      .filter((t) => t.capped)
      .map((t) => ({ variantId: t.variantId, kind: "quantity_capped" }));
    return {
      ...view,
      adjustments: [...view.adjustments, ...capped],
      merged: guestItems.length > 0,
    };
  }

  /** Le panier tel que le client l'affiche, après réconciliation avec le catalogue. */
  private async view(cart: CartRow | undefined, locale: Locale) {
    if (!cart)
      return {
        id: null,
        items: [],
        ...cartTotals([]),
        adjustments: [] as Adjustment[],
        merged: false,
      };
    let items = await this.repo.items(cart.id);
    const resolved = await this.variants(items.map((i) => i.variantId));
    const { removals, updates, adjustments } = reconcile(
      items.map((i) => {
        const r = resolved.get(i.variantId);
        return {
          itemId: i.id,
          variantId: i.variantId,
          quantity: i.quantity,
          purchasable: Boolean(r && r.variant.isActive && r.agg.product.status === "active"),
          stock: r?.variant.stock ?? null,
        };
      }),
    );
    if (removals.length || updates.length) {
      await this.repo.deleteItems(removals);
      for (const u of updates) await this.repo.updateItem(u.itemId, u.quantity);
      items = await this.repo.items(cart.id);
    }
    items.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const lines = await Promise.all(
      items.map(async (i) => {
        const { agg, variant } = resolved.get(i.variantId)!;
        const options = agg.options.map((o) => ({
          id: o.id,
          values: o.values.map((v) => ({ id: v.id, label: localize(v.label, locale) })),
        }));
        const unitPriceCents = resolvePrice(variant.priceCents, agg.product.priceCents);
        return {
          id: i.id,
          variantId: i.variantId,
          productSlug: agg.product.slug,
          productName: localize(agg.product.name, locale),
          variantLabel: variantLabel(options, variant.optionValues),
          imageUrl: await this.catalogService.imageUrl(agg.product.imageKey),
          unitPriceCents,
          quantity: i.quantity,
          lineTotalCents: unitPriceCents * i.quantity,
          maxQuantity: variant.stock,
          vatRateBps: agg.product.vatRateBps,
        };
      }),
    );
    const totals = cartTotals(lines);
    return {
      id: cart.id,
      items: lines.map(({ vatRateBps: _vat, ...l }) => l),
      ...totals,
      adjustments,
      merged: false,
    };
  }
}
