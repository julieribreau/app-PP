import { defineConfig, devices } from "@playwright/test";

// Bout en bout du web (skill test-runner §1) : Chromium, Firefox et WebKit, comme le
// socle le demande, contre le serveur autonome que lance l'image (`next build`, puis
// `.next/standalone/…/server.js`), pas le serveur de dev ni `next start` : on teste ce qui
// sera déployé (instrumentation Sentry comprise). E2E_BASE_URL vise un serveur déjà lancé.
const PORT = 3000;
const BASE_URL = process.env["E2E_BASE_URL"] ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 2 : 0,
  reporter: process.env["CI"] ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: BASE_URL, trace: "on-first-retry" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  ...(process.env["E2E_BASE_URL"]
    ? {}
    : {
        webServer: {
          command: "pnpm build && pnpm start:standalone",
          url: `${BASE_URL}/fr`,
          reuseExistingServer: !process.env["CI"],
          timeout: 300_000,
          // Une clé PostHog factice, figée au build : e2e/consent.spec.ts vérifie que rien ne
          // part avant le consentement et que la mesure démarre après, requêtes interceptées.
          env: { NEXT_PUBLIC_POSTHOG_KEY: process.env["NEXT_PUBLIC_POSTHOG_KEY"] ?? "phc_e2e" },
        },
      }),
});
