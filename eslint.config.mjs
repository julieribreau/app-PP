// ESLint flat config — racine monorepo. Étendu par chaque app.
// Règles cardinales : no-console (logger Pino exclusif), pas d'import relatif profond.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/.expo/**",
      "**/coverage/**",
      "**/.fallow/**",
      "**/playwright-report/**",
      "**/test-results/**",
      "**/storybook-static/**",
      // Généré par Next (next typegen, next build).
      "**/next-env.d.ts",
      // Copies à l'octet près des scripts de bullify-documentation (init-project §4) : on les
      // corrige là-bas, puis on les reporte ici. Les linter ici les ferait diverger.
      "scripts/**",
      "tools/sonar/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // console.log INTERDIT (cf socle/conventions) — utiliser le logger Pino.
      "no-console": "error",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/consistent-type-imports": "error",
      // Paramètre imposé par une interface mais pas encore lu (stub de repository) : `_nom`.
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      // Pas de fichier, de composant ni de fonction « god » (cf architecture-reference
      // §Découpage) : au-delà, on découpe, on ne relève pas le seuil.
      "max-lines": ["error", { max: 300, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["error", { max: 80, skipBlankLines: true, skipComments: true }],
      complexity: ["error", 10],
      "max-depth": ["error", 3],
      "max-params": ["error", 4],
      "max-nested-callbacks": ["error", 3],
    },
  },
  {
    // Fichiers de configuration lus par Node (Next, Metro, Babel, Vitest, Playwright) :
    // ses globales, et `require` dans ceux qui restent en CommonJS (Metro, Babel).
    files: ["**/*.config.{js,cjs,mjs}", "**/*.cjs"],
    languageOptions: {
      globals: {
        process: "readonly",
        URL: "readonly",
        __dirname: "readonly",
        module: "writable",
        require: "readonly",
      },
    },
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    // qa/a11y : scripts Node hors workspace (pa11y + puppeteer) ; le code passé à
    // page.evaluate tourne dans la page, d'où les globales du navigateur.
    files: ["qa/**/*.mjs"],
    languageOptions: {
      globals: {
        process: "readonly",
        URL: "readonly",
        Buffer: "readonly",
        fetch: "readonly",
        console: "readonly",
        document: "readonly",
        getComputedStyle: "readonly",
      },
    },
    rules: { "no-console": "off" },
  },
  {
    // Scénarios k6 : globales du moteur k6, pas de Node.
    files: ["apps/load-tests/**/*.js"],
    languageOptions: { globals: { __ENV: "readonly", __ITER: "readonly", __VU: "readonly" } },
  },
  {
    // Scripts en ligne de commande (seed, outils) : la console est leur sortie.
    files: ["apps/backend/src/seed/**", "scripts/**", "tools/**"],
    rules: { "no-console": "off" },
  },
  {
    // Un fichier de test ou de story est une suite de cas, pas une unité de code :
    // ses describe/it englobants dépassent naturellement les seuils de taille.
    files: ["**/*.{test,spec}.{ts,tsx}", "**/*.stories.{ts,tsx}", "**/e2e/**"],
    rules: { "max-lines": "off", "max-lines-per-function": "off", "max-nested-callbacks": "off" },
  },
  {
    // Injection NestJS par constructeur : au-delà de 6 dépendances, le service fait trop.
    files: ["apps/backend/**/*.ts"],
    rules: { "max-params": ["error", 6] },
  },
  {
    // Backend Nest : emitDecoratorMetadata lit à l'exécution le type des paramètres décorés
    // (injection par constructeur, DTO nestjs-zod de @Body/@Query). Sans ces options, la règle
    // consistent-type-imports réclame `import type` pour ces classes, et son --fix casserait
    // l'injection et la validation sans erreur de compilation.
    files: ["apps/backend/**/*.ts"],
    languageOptions: {
      parserOptions: { emitDecoratorMetadata: true, experimentalDecorators: true },
    },
  },
  prettier, // désactive les règles en conflit avec Prettier (toujours en dernier)
);
