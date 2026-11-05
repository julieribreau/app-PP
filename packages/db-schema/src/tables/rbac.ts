import { boolean, pgTable, primaryKey, text, uuid } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { createdAt, updatedAt } from "./columns";

// Brique comptes-auth/roles-permissions : catalogue des permissions synchronisé depuis le
// code, rôles du back-office, attribution multiple. On vérifie une permission, jamais un rôle.

export const permission = pgTable("permission", {
  key: text("key").primaryKey(), // '<module>.<action>' : 'account.suspend'
  module: text("module").notNull(),
  createdAt: createdAt(),
});

export const role = pgTable("role", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(), // 'super-admin', 'catalog-manager'…
  name: text("name").notNull(),
  description: text("description"),
  isSystem: boolean("is_system").notNull().default(false), // ni modifiable ni supprimable
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const rolePermission = pgTable(
  "role_permission",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => role.id, { onDelete: "cascade" }),
    permissionKey: text("permission_key")
      .notNull()
      .references(() => permission.key, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionKey] })],
);

export const userRole = pgTable(
  "user_role",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => role.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.roleId] })],
);
