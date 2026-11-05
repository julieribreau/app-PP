/**
 * Seed NutrionApp — données de démarrage RÉALISTES, synthétiques et anonymisées (cf skill `seed`).
 * Orchestrateur : `pnpm seed`. Découper par domaine (un fichier seed-<domaine>.ts par module).
 * Réutilisé par les tests e2e / la CI. Seeder ≥ 2 tenants si none.
 */
async function main() {
  // Jamais de données de démonstration dans la prod d'un client (skill seed). Le garde-fou
  // lit APP_ENV : NODE_ENV vaut `production` en préprod aussi, où le seed doit tourner.
  if (process.env["APP_ENV"] === "production") {
    console.error("[seed] refusé : APP_ENV=production");
    process.exit(1);
  }
  // await seedTenant();       // multi-tenant par défaut : seeder ≥1 tenant (le client) — même mono-client
  // await seedAccounts();     // personae crédibles (familles, agents…), pas de foo/bar — avec tenant_id
  // await seedCatalog();      // volumes plausibles
  // await seedEdgeCases();    // dossier incomplet, paiement échoué, compte désactivé…
  console.log("[seed] done"); // script en ligne de commande : no-console levé par eslint.config.mjs
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
