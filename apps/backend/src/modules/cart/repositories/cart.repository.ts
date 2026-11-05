import { Inject, Injectable } from "@nestjs/common";
import { cart, cartItem, type Drizzle } from "@nutrion/db-schema";
import { and, eq, inArray, sql } from "drizzle-orm";

import { DRIZZLE } from "../../db/db.module";

export type CartRow = typeof cart.$inferSelect;
export type CartItemRow = typeof cartItem.$inferSelect;

@Injectable()
export class CartRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Drizzle) {}

  async byUser(userId: string) {
    const [row] = await this.db.select().from(cart).where(eq(cart.userId, userId)).limit(1);
    return row;
  }

  async byGuestHash(hash: string) {
    const [row] = await this.db.select().from(cart).where(eq(cart.guestTokenHash, hash)).limit(1);
    return row;
  }

  async createForUser(userId: string) {
    const [row] = await this.db.insert(cart).values({ userId }).onConflictDoNothing().returning();
    return row ?? (await this.byUser(userId))!;
  }

  async createForGuest(hash: string) {
    const [row] = await this.db.insert(cart).values({ guestTokenHash: hash }).returning();
    return row!;
  }

  items(cartId: string) {
    return this.db.select().from(cartItem).where(eq(cartItem.cartId, cartId));
  }

  async item(cartId: string, itemId: string) {
    const [row] = await this.db
      .select()
      .from(cartItem)
      .where(and(eq(cartItem.cartId, cartId), eq(cartItem.id, itemId)))
      .limit(1);
    return row;
  }

  async setQuantity(cartId: string, variantId: string, quantity: number) {
    await this.db
      .insert(cartItem)
      .values({ cartId, variantId, quantity })
      .onConflictDoUpdate({
        target: [cartItem.cartId, cartItem.variantId],
        set: { quantity, updatedAt: sql`now()` },
      });
    await this.touch(cartId);
  }

  async updateItem(itemId: string, quantity: number) {
    await this.db.update(cartItem).set({ quantity }).where(eq(cartItem.id, itemId));
  }

  async deleteItems(itemIds: string[]) {
    if (itemIds.length) await this.db.delete(cartItem).where(inArray(cartItem.id, itemIds));
  }

  async deleteCart(cartId: string) {
    await this.db.delete(cart).where(eq(cart.id, cartId));
  }

  async touch(cartId: string) {
    await this.db.update(cart).set({ updatedAt: new Date() }).where(eq(cart.id, cartId));
  }
}
