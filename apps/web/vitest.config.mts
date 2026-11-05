import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unitaires et composants du web : `<Composant>.test.tsx` à côté du composant (skill
// test-runner §1). Le bout en bout est à Playwright (e2e/, playwright.config.ts).
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}", "app/**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/.next/**", "e2e/**"],
    coverage: {
      provider: "v8",
      // lcov pour Sonar (sonar-project.properties), chemins réécrits par tools/sonar.
      reporter: ["text-summary", "html", "lcov"],
      include: ["src/**/*.{ts,tsx}", "app/**/*.{ts,tsx}"],
      exclude: ["**/*.test.{ts,tsx}"],
    },
  },
});
