import { index, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { createdAt } from "./columns";

// Journal d'audit du back-office (socle) : chaque action d'un agent, avec l'avant/après
// sans donnée sensible en clair. Lu au back-office, jamais modifié.
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: uuid("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    action: text("action").notNull(), // 'account.suspend', 'catalog.product.update'…
    targetType: text("target_type").notNull(), // 'user', 'product', 'category'…
    targetId: text("target_id"),
    diff: jsonb("diff").$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [
    index("audit_log_target_idx").on(t.targetType, t.targetId, t.createdAt),
    index("audit_log_actor_idx").on(t.actorUserId, t.createdAt),
  ],
);
