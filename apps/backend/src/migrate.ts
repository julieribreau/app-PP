// Point d'entrée de migration : `node dist/migrate.js` dans l'image (migrer() de
// bullify-deploy, avant `compose up`), `pnpm db:migrate` en dev. Jamais au démarrage de
// l'API : une migration qui casse ferait boucler le conteneur.
//
// Le migrateur de drizzle-orm, pas drizzle-kit : l'outil de génération n'entre pas dans
// l'image. Les deux lisent le même journal (migrations/meta/_journal.json) et tiennent la
// même table (drizzle.__drizzle_migrations) : une base migrée par l'un l'est pour l'autre.
// Chaque migration tourne dans une transaction ; celles déjà jouées sont sautées.
import { join } from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { z } from "zod";

const env = z
  .object({
    DATABASE_URL: z.url(),
    // Image : /app/migrations, copié de packages/db-schema/migrations. Dev : le script
    // db:migrate pointe sur le paquet.
    MIGRATIONS_DIR: z.string().default(join(__dirname, "..", "migrations")),
  })
  .parse(process.env);

async function main() {
  // Une connexion, fermée à la fin : le process doit rendre la main pour que le
  // déploiement continue.
  const sql = postgres(env.DATABASE_URL, { max: 1, onnotice: () => undefined });
  try {
    await migrate(drizzle(sql), { migrationsFolder: env.MIGRATIONS_DIR });
    process.stdout.write(`${JSON.stringify({ level: "info", msg: "migrations appliquées" })}\n`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err: unknown) => {
  // drizzle-orm enveloppe l'erreur de PostgreSQL (« Failed query: … ») : la vraie cause
  // (mot de passe refusé, migration fautive) est dans `cause`.
  const message = err instanceof Error ? err.message : String(err);
  const cause = err instanceof Error && err.cause instanceof Error ? err.cause.message : undefined;
  process.stderr.write(
    `${JSON.stringify({ level: "fatal", msg: "migration en échec", err: message, cause })}\n`,
  );
  process.exit(1);
});
