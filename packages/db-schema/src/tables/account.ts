import { boolean, index, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { createdAt, updatedAt } from "./columns";

// Adresses de livraison de l'usager (espace personnel).
export const address = pgTable(
  "address",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    label: text("label"), // « Maison », « Bureau »
    recipientName: text("recipient_name").notNull(),
    line1: text("line1").notNull(),
    line2: text("line2"),
    postalCode: text("postal_code").notNull(),
    city: text("city").notNull(),
    countryCode: text("country_code").notNull().default("FR"), // ISO 3166-1
    phone: text("phone"),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("address_user_id_idx").on(t.userId)],
);
