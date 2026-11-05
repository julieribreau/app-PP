import { timestamp } from "drizzle-orm/pg-core";

// Colonnes d'horodatage communes : toujours `timestamptz` (conventions-code §Interdits).
export const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
export const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date());

/** Texte traduit : la langue pivot (fr) est obligatoire, les autres facultatives. */
export type LocalizedText = { fr: string; en?: string };
