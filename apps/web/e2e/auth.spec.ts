import { expect, test } from "@playwright/test";
import fr from "@nutrion/i18n/messages/fr.json";

import { consentDecided, mockApi } from "./fixtures/api";

test.beforeEach(async ({ page }) => consentDecided(page));

test("connexion : fusion du panier invité puis espace personnel", async ({ page }) => {
  const api = await mockApi(page);
  await page.goto("/fr/connexion");
  await page.getByLabel(fr.auth.email).fill("camille.martin@exemple.fr");
  await page.getByLabel(fr.auth.password, { exact: true }).fill("Nutrion-Demo-2026");
  await page.getByRole("button", { name: fr.auth.signIn, exact: true }).click();
  await expect(page).toHaveURL(/\/fr\/compte$/);
  await expect(page.getByRole("heading", { level: 1, name: fr.account.title })).toBeVisible();
  expect(api.calls).toContain("POST /v1/cart/merge");
});

test("inscription : mot de passe trop court refusé avant envoi", async ({ page }) => {
  const api = await mockApi(page);
  await page.goto("/fr/connexion");
  await page.getByRole("tab", { name: fr.auth.signUpTab }).click();
  await page.getByLabel(fr.auth.firstName, { exact: true }).fill("Léa");
  await page.getByLabel(fr.auth.lastName, { exact: true }).fill("Fontaine");
  await page.getByLabel(fr.auth.email).fill("lea@exemple.fr");
  await page.getByLabel(fr.auth.password, { exact: true }).fill("court");
  await page.getByRole("button", { name: fr.auth.signUp }).click();
  // Le mot de passe et la case des conditions sont signalés, rien n'est envoyé.
  await expect(page.getByText(fr.auth.termsRequired)).toBeVisible();
  await expect(page.getByLabel(fr.auth.password, { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  expect(api.calls.some((c) => c.includes("sign-up"))).toBe(false);
});
