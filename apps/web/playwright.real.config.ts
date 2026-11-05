import { defineConfig, devices } from "@playwright/test";

// Bout en bout RÉEL : aucune API simulée. Vise une stack déjà lancée et seedée :
// backend (:3001), site en build autonome (:3000, BACKEND_URL vers le backend), Mailpit
// (:8025) pour lire les e-mails. Commande : `pnpm test:e2e:real` (cf README, « Tests réels »).
// Les tests modifient la base (comptes créés, usager suspendu puis réactivé, produit créé
// puis archivé) : relancer `make seed` remet les données de démonstration en place.
const BASE_URL = process.env["E2E_BASE_URL"] ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e-real",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env["CI"] ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: BASE_URL, trace: "retain-on-failure", locale: "fr-FR" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
