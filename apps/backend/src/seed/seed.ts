import "../load-env";

import { createDb } from "@nutrion/db";

import { seedAccounts, seedCarts } from "./seed-accounts";
import { seedCatalog } from "./seed-catalog";

/**
 * Seed NutrionApp : données de démarrage RÉALISTES, synthétiques (skill `seed`). Idempotent :
 * ce qui existe déjà (même e-mail, même slug) est laissé tel quel. Réutilisé par la CI.
 * Mono-tenant (ADR-001) : pas de tenant à seeder.
 */
async function main() {
  // Jamais de données de démonstration dans la prod d'un client (skill seed). Le garde-fou
  // lit APP_ENV : NODE_ENV vaut `production` en préprod aussi, où le seed doit tourner.
  if (process.env["APP_ENV"] === "production") {
    console.error("[seed] refusé : APP_ENV=production");
    process.exit(1);
  }
  const url = process.env["DATABASE_URL"];
  if (!url) throw new Error("DATABASE_URL manquante");
  const db = createDb(url);
  try {
    const catalog = await seedCatalog(db);
    const accounts = await seedAccounts(db);
    await seedCarts(db, accounts.ids);
    console.log(
      `[seed] ${catalog.categories} catégories, ${catalog.productsCreated} produits créés, ${accounts.users} comptes`,
    );
  } finally {
    await (db as unknown as { $client: { end(): Promise<void> } }).$client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
