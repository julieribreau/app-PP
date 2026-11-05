import { defineConfig } from "vitest/config";

// Règles et stockage sous Node ; écrans web sous jsdom (`@vitest-environment jsdom` en tête du
// fichier). Les écrans React Native se testent dans apps/mobile (jest-expo) : Vitest ne lit pas
// la source de react-native.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**"],
    coverage: {
      provider: "v8",
      // lcov pour Sonar (sonar-project.properties), chemins réécrits par tools/sonar.
      reporter: ["text-summary", "html", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/native/**"],
    },
  },
});
