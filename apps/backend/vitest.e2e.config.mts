import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

// Intégration du backend : l'application Nest réelle contre un vrai PostgreSQL et un vrai
// Redis (`make up`, ou les services du job e2e de ci.yml). Jamais de base mockée ici.
// Les valeurs ci-dessous sont celles du docker-compose.yml de dev ; la CI pose les siennes.
const parDefaut = {
  DATABASE_URL: "postgres://postgres:postgres@localhost:5432/nutrion-app",
  REDIS_URL: "redis://localhost:6379",
  // Valeur de test sans entropie (gitleaks ne la prend pas pour un secret).
  BETTER_AUTH_SECRET: "e2e".padEnd(32, "-"),
  BETTER_AUTH_URL: "http://localhost:3001",
  WEB_URL: "http://localhost:3000",
  BREVO_API_KEY: "xkeysib-e2e",
  // Le stockage et l'envoi d'e-mails sont remplacés en mémoire par test/app.ts ; ces valeurs
  // ne servent qu'à passer la validation d'env au chargement des modules.
  S3_ENDPOINT: "http://localhost:9000",
  S3_BUCKET: "nutrion-app-e2e",
  S3_ACCESS_KEY: "e2e",
  S3_SECRET_KEY: "e2e",
};

const env = Object.fromEntries(
  Object.entries(parDefaut).map(([cle, valeur]) => [cle, process.env[cle] ?? valeur]),
);
// Base dédiée, dérivée de DATABASE_URL (« nutrion-app » → « nutrion-app-e2e ») : les tests la
// vident à chaque passage, jamais la base de dev ni celle que la CI vient de migrer.
const url = new URL(env.DATABASE_URL!);
if (!url.pathname.endsWith("-e2e")) url.pathname = `${url.pathname}-e2e`;
env.DATABASE_URL = url.toString();

export default defineConfig({
  // SWC et non esbuild : Nest lit les métadonnées des décorateurs (injection, DTO validées),
  // que seul un compilateur qui les émet produit, comme tsc pour `nest build`.
  plugins: [swc.vite({ module: { type: "es6" } })],
  test: {
    environment: "node",
    include: ["test/**/*.e2e-spec.ts"],
    globalSetup: ["test/global-setup.ts"],
    // Un process par fichier, l'un après l'autre : chacun démarre son application et ses
    // connexions ; l'env (Sentry compris) se lit au chargement des modules.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env,
  },
});
