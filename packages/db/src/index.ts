import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { dbSchema } from "@nutrion/db-schema";

// Lib infra `db` — possède DATABASE_URL (tranche d'env isolée, cf architecture-reference).
// Token DRIZZLE injecté dans les repositories des modules NestJS.
export const DRIZZLE = Symbol("DRIZZLE");

export function createDb(databaseUrl: string) {
  return drizzle(postgres(databaseUrl), { schema: dbSchema });
}
export type { Drizzle } from "@nutrion/db-schema";
