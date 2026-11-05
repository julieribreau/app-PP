import { expect, test } from "@playwright/test";
import en from "@nutrion/i18n/messages/en.json";
import fr from "@nutrion/i18n/messages/fr.json";

import {
  CAMILLE,
  consentDecided,
  createVerifiedUser,
  linkIn,
  signIn,
  trackConsoleErrors,
  uniqueEmail,
  waitForMail,
} from "./support";

// Parcours client contre la vraie stack (backend, base seedée, Mailpit).
const LABELS = { email: fr.auth.email, password: fr.auth.password, submit: fr.auth.signIn };

test.beforeEach(async ({ page }) => consentDecided(page));

test("inscription → e-mail de vérification → connexion", async ({ page }) => {
  const done = trackConsoleErrors(page);
  const email = uniqueEmail("lea");
  const password = "Fontaine-2026-ok";
  await page.goto("/fr/connexion");
  await page.getByRole("tab", { name: fr.auth.signUpTab }).click();
  await page.getByLabel(fr.auth.firstName, { exact: true }).fill("Léa");
  await page.getByLabel(fr.auth.lastName, { exact: true }).fill("Fontaine");
  await page.getByLabel(fr.auth.email).fill(email);
  await page.getByLabel(fr.auth.password, { exact: true }).fill(password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: fr.auth.signUp }).click();
  await expect(page.getByRole("status")).toContainText(email);

  // Connexion refusée tant que l'e-mail n'est pas confirmé.
  await signIn(page, { email, password }, LABELS);
  await expect(page.locator("#signin-error")).toContainText(fr.auth.emailNotVerified);

  const mail = await waitForMail(email);
  await page.goto(linkIn(mail, "verify-email"));
  await expect(page).toHaveURL(/\/fr\/(verifier-email|compte)/);

  await signIn(page, { email, password }, LABELS);
  await expect(page).toHaveURL(/\/fr\/compte$/);
  await expect(page.getByRole("heading", { level: 1, name: fr.account.title })).toBeVisible();
  await expect(page.getByLabel(fr.auth.firstName)).toHaveValue("Léa");
  done();
});

test("panier invité de deux variantes fusionné à la connexion", async ({ page }) => {
  const done = trackConsoleErrors(page);
  await page.goto("/fr/boutique/avoine-cacao");
  await expect(page.getByRole("heading", { level: 1, name: "Avoine & cacao" })).toBeVisible();
  await page.getByRole("button", { name: fr.product.addToCart }).click();
  await expect(page.getByRole("status").filter({ hasText: /Ajouté au panier/ })).toBeVisible();
  await page.getByRole("button", { name: "Noisette", exact: true }).click();
  await page.getByRole("button", { name: fr.product.addToCart }).click();
  await expect(page.getByRole("status").filter({ hasText: /Noisette/ })).toBeVisible();

  await page.goto("/fr/panier");
  await expect(page.getByRole("note")).toContainText(fr.cart.guestNote);
  const lines = page
    .getByRole("list")
    .filter({ has: page.getByRole("button", { name: /Retirer .* du panier/ }) });
  await expect(lines.getByRole("listitem").filter({ hasText: "Avoine & cacao" })).toHaveCount(2);

  // Camille a déjà un panier au seed : la fusion additionne.
  await signIn(page, CAMILLE, LABELS);
  await expect(page).toHaveURL(/\/fr\/compte$/);
  await page.goto("/fr/panier");
  await expect(page.getByRole("note")).toHaveCount(0);
  await expect(page.getByText("Noisette").first()).toBeVisible();
  await expect(page.getByRole("button", { name: fr.cart.checkout })).toBeDisabled();
  done();
});

test("espace personnel : profil, adresse, thème et langue gardés, export ZIP", async ({ page }) => {
  const done = trackConsoleErrors(page);
  const user = await createVerifiedUser("compte", "Manon", "Essai");
  await signIn(page, user, LABELS);
  await expect(page).toHaveURL(/\/fr\/compte$/);

  // Profil
  await page.getByLabel(fr.account.phone).fill("06 11 22 33 44");
  await page.getByLabel(fr.auth.lastName, { exact: true }).fill("Essai-Modifiée");
  await page.locator("#profil").getByRole("button", { name: fr.common.save }).click();
  await expect(page.getByText(fr.common.saved).first()).toBeVisible();

  // Adresse
  await page.getByRole("button", { name: fr.account.addAddress }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(fr.account.address.label).fill("Maison");
  await dialog.getByLabel(fr.account.address.recipient).fill("Manon Essai");
  await dialog.getByLabel(fr.account.address.line1, { exact: true }).fill("3 rue Mercière");
  await dialog.getByLabel(fr.account.address.postalCode).fill("69002");
  await dialog.getByLabel(fr.account.address.city).fill("Lyon");
  await dialog.getByRole("button", { name: fr.common.save }).click();
  await expect(page.locator("#adresses")).toContainText("3 rue Mercière");

  // Thème sombre
  await page
    .getByRole("radiogroup", { name: fr.theme.label })
    .getByRole("radio", { name: fr.theme.dark })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.reload();
  await expect(page.getByLabel(fr.account.phone)).toHaveValue("06 11 22 33 44");
  await expect(page.getByLabel(fr.auth.lastName, { exact: true })).toHaveValue("Essai-Modifiée");
  await expect(page.locator("#adresses")).toContainText("Lyon");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  // Export ZIP
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: fr.account.export }).click();
  const file = await download;
  const path = await file.path();
  const { statSync, readFileSync } = await import("node:fs");
  expect(statSync(path).size).toBeGreaterThan(100);
  expect(readFileSync(path).subarray(0, 2).toString()).toBe("PK");

  // Langue anglaise, gardée au rechargement et dans le profil
  await page
    .getByRole("radiogroup", { name: fr.locale.label })
    .getByRole("radio", { name: fr.locale.en })
    .click();
  await expect(page).toHaveURL(/\/en\/compte/);
  await expect(page.getByRole("heading", { level: 1, name: en.account.title })).toBeVisible();
  await page.goto("/fr/compte");
  await page.reload();
  const me = await page.request.get("/api/v1/account/me");
  expect((await me.json()).locale).toBe("en");
  expect((await me.json()).theme).toBe("dark");
  done();
});

test("mot de passe oublié : lien par e-mail, nouveau mot de passe, connexion", async ({ page }) => {
  const done = trackConsoleErrors(page);
  const user = await createVerifiedUser("oubli");
  await page.goto("/fr/mot-de-passe-oublie");
  await page.getByLabel(fr.auth.email).fill(user.email);
  await page.getByRole("button", { name: fr.auth.resetSend }).click();
  await expect(page.getByRole("status").filter({ hasText: fr.auth.resetSent })).toBeVisible();

  const mail = await waitForMail(user.email, /mot de passe/i);
  await page.goto(linkIn(mail, "reset-password"));
  await expect(page).toHaveURL(/reinitialiser-mot-de-passe/);
  const fresh = "Nouveau-Pass-2026";
  await page.getByLabel(fr.auth.newPassword).fill(fresh);
  await page.getByRole("button", { name: fr.auth.resetTitle }).click();
  await expect(page.getByText(fr.auth.resetDone)).toBeVisible();

  await signIn(page, { email: user.email, password: user.password }, LABELS);
  await expect(page.locator("#signin-error")).toContainText(fr.auth.invalidCredentials);
  await signIn(page, { email: user.email, password: fresh }, LABELS);
  await expect(page).toHaveURL(/\/fr\/compte$/);
  done();
});
