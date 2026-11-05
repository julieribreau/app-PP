import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

// Unitaires du backend : `<x>.spec.ts` à côté du fichier (skill test-runner §1). Les tests
// d'intégration (vrai PostgreSQL, vrai Redis) ont leur config : vitest.e2e.config.mts.
export default defineConfig({
  // SWC et non esbuild : Nest lit les métadonnées des décorateurs (injection, DTO validées),
  // que seul un compilateur qui les émet produit, comme tsc pour `nest build`.
  plugins: [swc.vite({ module: { type: "es6" } })],
  test: {
    environment: "node",
    include: ["src/**/*.spec.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "test/**"],
    coverage: {
      provider: "v8",
      // lcov pour Sonar (sonar-project.properties), chemins réécrits par tools/sonar.
      reporter: ["text-summary", "html", "lcov"],
      include: ["src/**/*.ts"],
      // Amorçage et déclarations : rien à exécuter sans démarrer le process entier.
      exclude: ["src/**/*.spec.ts", "src/**/main.ts", "src/**/instrument.ts", "src/seed/**"],
    },
  },
});
