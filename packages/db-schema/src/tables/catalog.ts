import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { createdAt, type LocalizedText, updatedAt } from "./columns";

// Brique facturation-paiement, partie catalogue : on vend toujours une variante. Un produit
// sans axe en a une seule, créée d'office. Montants en centimes TTC (prix de référence
// grand public), TVA en points de base (550 = 5,5 %).

export const productStatus = pgEnum("product_status", ["draft", "active", "archived"]);

export const category = pgTable("category", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: jsonb("name").$type<LocalizedText>().notNull(),
  position: integer("position").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const product = pgTable(
  "product",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    categoryId: uuid("category_id").references(() => category.id, { onDelete: "set null" }),
    name: jsonb("name").$type<LocalizedText>().notNull(),
    // Accroche d'une ligne, affichée sous le nom dans les listes.
    summary: jsonb("summary").$type<LocalizedText>().notNull().default({ fr: "" }),
    // Texte enrichi, passé par sanitize-html à l'écriture (liste blanche unique, socle).
    description: jsonb("description").$type<LocalizedText>().notNull(),
    imageKey: text("image_key"), // une photo par produit, sur le stockage objet
    priceCents: integer("price_cents").notNull(), // TTC
    vatRateBps: integer("vat_rate_bps").notNull().default(550),
    status: productStatus("status").notNull().default("draft"),
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("product_category_idx").on(t.categoryId, t.status)],
);

// Axe de variante (« Saveur », « Format ») et ses valeurs.
export const productOption = pgTable("product_option", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => product.id, { onDelete: "cascade" }),
  name: jsonb("name").$type<LocalizedText>().notNull(),
  position: integer("position").notNull().default(0),
});

export const productOptionValue = pgTable("product_option_value", {
  id: uuid("id").primaryKey().defaultRandom(),
  optionId: uuid("option_id")
    .notNull()
    .references(() => productOption.id, { onDelete: "cascade" }),
  label: jsonb("label").$type<LocalizedText>().notNull(),
  position: integer("position").notNull().default(0),
});

export const productVariant = pgTable(
  "product_variant",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    // { optionId: valueId } ; {} pour la variante unique.
    optionValues: jsonb("option_values").$type<Record<string, string>>().notNull(),
    // Identifiants de valeurs triés et joints : une combinaison n'existe qu'une fois.
    combinationKey: text("combination_key").notNull(),
    sku: text("sku").unique(),
    priceCents: integer("price_cents"), // null = hérite du prix du produit
    stock: integer("stock"), // null = illimité
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("product_variant_combination_uq").on(t.productId, t.combinationKey)],
);
