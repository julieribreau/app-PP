import { join } from "node:path";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

// Prépare la base d'intégration : créée si absente, migrée, vidée. Refuse toute base dont
// le nom ne finit pas par « -e2e » (vitest.e2e.config.mts la dérive de DATABASE_URL).
export default async function setup(project: { config: { env?: Record<string, string> } }) {
  const url = new URL(project.config.env?.["DATABASE_URL"] ?? "");
  const name = decodeURIComponent(url.pathname.slice(1));
  if (!name.endsWith("-e2e")) throw new Error(`Base d'intégration refusée : ${name}`);

  const admin = new URL(url);
  admin.pathname = "/postgres";
  const root = postgres(admin.toString(), { max: 1, onnotice: () => undefined });
  const [exists] = await root`select 1 from pg_database where datname = ${name}`;
  if (!exists) await root.unsafe(`create database "${name.replace(/"/g, '""')}"`);
  await root.end();

  const sql = postgres(url.toString(), { max: 1, onnotice: () => undefined });
  await migrate(drizzle(sql), {
    migrationsFolder: join(__dirname, "../../../packages/db-schema/migrations"),
  });
  const tables = await sql<
    { tablename: string }[]
  >`select tablename from pg_tables where schemaname = 'public'`;
  if (tables.length)
    await sql.unsafe(`truncate ${tables.map((t) => `"${t.tablename}"`).join(", ")} cascade`);
  await sql.end();
}
