import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Intégration mobile ↔ backend RÉEL (pas de fetch simulé) : `pnpm test:integration`, backend
// démarré et seedé sur EXPO_PUBLIC_API_URL (défaut http://localhost:3001), Mailpit sur :8025.
// Seuls les modules natifs (trousseau, AsyncStorage, react-native, expo-*) sont remplacés par
// des doubles en mémoire (src/test/native-modules.ts) ; le client API, le client Better Auth
// Expo, le jeton du panier invité et la fusion sont ceux de l'app.
export default defineConfig({
  define: { __DEV__: false },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
    setupFiles: ["src/test/native-modules.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    server: { deps: { inline: [/@better-auth\/expo/] } },
  },
});
