import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unitaires du mobile sous Node : hooks, stores et logique de src/ (*.test.ts, skill
// test-runner §1). Les composants React Native (*.test.tsx) passent par jest-expo
// (jest.config.js) ; les parcours se testent en Maestro (skill mobile-dev-expo §13).
export default defineConfig({
  // Global posé par Metro au runtime : absent sous Node.
  define: { __DEV__: false },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/.expo/**"],
    coverage: {
      provider: "v8",
      // lcov pour Sonar (sonar-project.properties), chemins réécrits par tools/sonar.
      reporter: ["text-summary", "html", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["**/*.test.{ts,tsx}"],
    },
  },
});
