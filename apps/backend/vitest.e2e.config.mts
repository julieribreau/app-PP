import { defineConfig } from "vitest/config";

// Intégration du backend : l'application Nest réelle contre un vrai PostgreSQL et un vrai
// Redis (`make up`, ou les services du job e2e de ci.yml). Jamais de base mockée ici.
// Les valeurs ci-dessous sont celles du docker-compose.yml de dev ; la CI pose les siennes.
const parDefaut = {
  DATABASE_URL: "postgres://postgres:postgres@localhost:5432/nutrion-app",
  REDIS_URL: "redis://localhost:6379",
  // Valeur de test sans entropie (gitleaks ne la prend pas pour un secret).
  BETTER_AUTH_SECRET: "e2e".padEnd(32, "-"),
  BREVO_API_KEY: "xkeysib-e2e",
};

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.e2e-spec.ts"],
    // Un process par fichier, l'un après l'autre : chacun démarre son application et ses
    // connexions ; l'env (Sentry compris) se lit au chargement des modules.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    env: Object.fromEntries(
      Object.entries(parDefaut).map(([cle, valeur]) => [cle, process.env[cle] ?? valeur]),
    ),
  },
});
