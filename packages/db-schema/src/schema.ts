// Schéma Drizzle — source de vérité. Toute évolution = une migration (pnpm db:generate).
// Mono-tenant (exception actée en ADR-001 : un seul client, certain) : pas de tenant_id ni
// de RLS. Le jour où un second client arrive, l'ajout passe par la brique multi-tenant.
export * from "./tables/auth";
export * from "./tables/rbac";
export * from "./tables/account";
export * from "./tables/audit";
export * from "./tables/catalog";
export * from "./tables/cart";
export type { LocalizedText } from "./tables/columns";
