import { sql } from "drizzle-orm";
import { boolean, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

// Schéma Drizzle — source de vérité. Toute évolution = une migration (db:generate).
// MULTI-TENANT PAR DÉFAUT (cf socle) : tenant_id NOT NULL + RLS forcée sur TOUTES les tables,
// hors exceptions fermées (tenant, tables d'identité de Better Auth). Cf brique multi-tenant §RLS.

export const tenant = pgTable("tenant", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  // Localisation : le pays fixe devise + timezone par défaut (dérivées, surchargeables)
  countryCode: text("country_code").notNull().default("FR"), // ISO 3166-1
  currency: text("currency").notNull().default("EUR"), // ISO 4217 — défaut selon le pays
  timezone: text("timezone").notNull().default("Europe/Paris"), // IANA — défaut selon le pays
  defaultLocale: text("default_locale").notNull().default("fr-FR"),
  branding: jsonb("branding"), // couleurs, police, logo, PDF (surcharge des tokens)
  textOverrides: jsonb("text_overrides"), // surcharges i18n par tenant
  featureFlags: jsonb("feature_flags"), // modules activés par tenant
  settings: jsonb("settings"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// URL du tenant : sous-domaine de la plateforme d'office, domaine du client configuré au
// back-office (cf brique multi-tenant §URL du tenant).
export const tenantDomain = pgTable(
  "tenant_domain",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    host: text("host").notNull().unique(), // minuscule, sans schéma ni chemin
    kind: text("kind").notNull(), // 'platform' | 'custom'
    isPrimary: boolean("is_primary").notNull().default(false),
    boOnly: boolean("bo_only").notNull().default(false),
    status: text("status").notNull().default("pending"), // 'pending' | 'active' | 'failed'
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("tenant_domain_primary_uq")
      .on(t.tenantId)
      .where(sql`${t.isPrimary}`),
  ],
);

export const example = pgTable("example", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenant.id), // tenant_id partout (+ RLS via policy)
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
