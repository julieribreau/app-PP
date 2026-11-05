// Composants React Native (*.test.tsx) sous jest-expo, avec @testing-library/react-native :
// Vitest ne sait pas lire la source de react-native. La logique reste sous Vitest (*.test.ts,
// vitest.config.mts). `pnpm test` lance les deux ; les arguments (--coverage) vont à Vitest,
// jest écrit sa couverture en CI dans coverage-jest/ (lcov, listé dans sonar-project.properties).
const preset = require("jest-expo/jest-preset");

module.exports = {
  ...preset,
  testMatch: ["<rootDir>/src/**/*.test.tsx"],
  // Alias `@/` du tsconfig, que Babel ne lit pas.
  moduleNameMapper: { ...preset.moduleNameMapper, "^@/(.*)$": "<rootDir>/src/$1" },
  // Les paquets du workspace se lisent par leur chemin réel, hors node_modules : transformés
  // d'office. Ceux de node_modules qui publient du JSX ou de l'ESM sont listés ici.
  transformIgnorePatterns: [
    "node_modules/(?!(?:\\.pnpm/[^/]+/node_modules/)?(?:(jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?|expo-.*|@expo/.*|react-native-.*|@react-navigation/.*|posthog-react-native|@posthog/.*|@sentry/react-native))",
  ],
  collectCoverage: Boolean(process.env.CI),
  coverageDirectory: "coverage-jest",
  coverageReporters: ["lcov", "text-summary"],
  collectCoverageFrom: ["src/**/*.{ts,tsx}", "!src/**/*.test.{ts,tsx}"],
};
