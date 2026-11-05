import { check, index, integer, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { user } from "./auth";
import { productVariant } from "./catalog";
import { createdAt, updatedAt } from "./columns";

// Panier : d'un usager connecté (user_id) ou d'un invité (jeton anonyme, haché ici).
// À la connexion, le panier invité fusionne dans celui du compte puis disparaît.
export const cart = pgTable(
  "cart",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => user.id, { onDelete: "cascade" }),
    guestTokenHash: text("guest_token_hash"), // sha256 du jeton, jamais le jeton
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("cart_user_uq").on(t.userId),
    uniqueIndex("cart_guest_uq").on(t.guestTokenHash),
    check("cart_owner_ck", sql`${t.userId} IS NOT NULL OR ${t.guestTokenHash} IS NOT NULL`),
    index("cart_updated_at_idx").on(t.updatedAt),
  ],
);

export const cartItem = pgTable(
  "cart_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => cart.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariant.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("cart_item_variant_uq").on(t.cartId, t.variantId),
    check("cart_item_quantity_ck", sql`${t.quantity} > 0`),
  ],
);
