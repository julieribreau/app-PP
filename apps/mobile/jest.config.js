// Composants React Native (*.test.tsx) sous jest-expo, avec @testing-library/react-native :
// Vitest ne sait pas lire la source de react-native. La logique reste sous Vitest (*.test.ts,
// vitest.config.mts). `pnpm test` lance les deux ; les arguments (--coverage) vont à Vitest,
// jest écrit sa couverture en CI dans coverage-jest/ (lcov, listé dans sonar-project.properties).
const path = require("node:path");
const preset = require("jest-expo/jest-preset");

// Une seule copie de react et de react-native, celles de l'app : le lockfile en contient une
// seconde (react 19.3.1, tirée par react-dom 19.3.1 du Storybook) que @testing-library résout
// sinon, et deux React dans un même rendu cassent les hooks.
const own = (name) => path.dirname(require.resolve(`${name}/package.json`, { paths: [__dirname] }));
const dedupe = Object.fromEntries(
  ["react", "react-native"].flatMap((name) => [
    [`^${name}$`, own(name)],
    [`^${name}/(.*)$`, `${own(name)}/$1`],
  ]),
);

module.exports = {
  ...preset,
  testMatch: ["<rootDir>/src/**/*.test.tsx"],
  setupFiles: [...(preset.setupFiles ?? []), "<rootDir>/jest.setup.js"],
  // Alias `@/` du tsconfig, que Babel ne lit pas.
  moduleNameMapper: { ...preset.moduleNameMapper, ...dedupe, "^@/(.*)$": "<rootDir>/src/$1" },
  // Les paquets du workspace se lisent par leur chemin réel, hors node_modules : transformés
  // d'office. Ceux de node_modules qui publient du JSX ou de l'ESM sont listés ici.
  transformIgnorePatterns: [
    "node_modules/(?!(?:\\.pnpm/[^/]+/node_modules/)?(?:(jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?|expo-.*|@expo/.*|@expo-google-fonts/.*|react-native-.*|@react-navigation/.*|posthog-react-native|@posthog/.*|@sentry/react-native|better-auth|@better-auth/.*|@tanstack/.*))",
  ],
  collectCoverage: Boolean(process.env.CI),
  coverageDirectory: "coverage-jest",
  coverageReporters: ["lcov", "text-summary"],
  collectCoverageFrom: ["src/**/*.{ts,tsx}", "!src/**/*.test.{ts,tsx}"],
};
