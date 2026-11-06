import { execFileSync } from "node:child_process";
import { join } from "node:path";

import { expect, test } from "@playwright/test";
import fr from "@nutrion/i18n/messages/fr.json";

import {
  adminSession,
  CAMILLE,
  consentDecided,
  createVerifiedUser,
  linkIn,
  SITE_ORIGIN,
  signIn,
  trackConsoleErrors,
  uniqueEmail,
  waitForMail,
} from "./support";

// Espace personnel, sécurité du compte et panier, contre la vraie stack (docs/qa/matrice-tests.md).
const LABELS = { email: fr.auth.email, password: fr.auth.password, submit: fr.auth.signIn };
const FIXTURES = join(__dirname, "fixtures");

test.beforeEach(async ({ page }) => consentDecided(page));

test("photo de profil : envoyée, affichée dans le compte et la barre du site, puis retirée", async ({
  page,
}) => {
  const done = trackConsoleErrors(page);
  const user = await createVerifiedUser("avatar", "Inès", "Photo");
  await signIn(page, user, LABELS);
  await expect(page).toHaveURL(/\/fr\/compte$/);
  await expect(page.getByTestId("header-avatar")).toHaveCount(0);
  await page.locator("#profil input[type=file]").setInputFiles(join(FIXTURES, "avatar.png"));
  const headerImg = page.getByTestId("header-avatar").locator("img");
  await expect(headerImg).toBeVisible();
  await expect
    .poll(() => headerImg.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
  await expect(page.locator("#profil img")).toBeVisible();
  await page.goto("/fr/boutique");
  await expect(page.getByTestId("header-avatar").locator("img")).toBeVisible();
  await page.goto("/fr/compte");
  await page.getByRole("button", { name: fr.account.removePhoto }).click();
  await expect(page.getByTestId("header-avatar")).toHaveCount(0);
  await expect(page.locator("#profil img")).toHaveCount(0);
  done();
});

test("changement d'e-mail : confirmé par un lien envoyé à la nouvelle adresse", async ({
  page,
}) => {
  const user = await createVerifiedUser("ancien", "Hugo", "Change");
  const newEmail = uniqueEmail("nouveau");
  await signIn(page, user, LABELS);
  await expect(page).toHaveURL(/\/fr\/compte$/);
  await page.getByLabel(fr.auth.email).fill(newEmail);
  await page.locator("#profil").getByRole("button", { name: fr.common.save }).click();
  await expect(page.getByText(newEmail).first()).toBeVisible();
  // Rien ne change tant que la nouvelle adresse n'est pas confirmée.
  expect((await (await page.request.get("/api/v1/account/me")).json()).email).toBe(user.email);
  await page.goto(linkIn(await waitForMail(newEmail), "verify-email"));
  await page.goto("/fr/compte");
  await expect(page.getByLabel(fr.auth.email)).toHaveValue(newEmail);
  // L'ancienne adresse ne permet plus de se connecter, la nouvelle oui.
  const old = await page.request.post("/api/v1/auth/sign-in/email", {
    data: user,
    headers: { origin: SITE_ORIGIN },
  });
  expect(old.status()).toBe(401);
});

test("mot de passe changé, autre appareil déconnecté, reconnexion avec le nouveau", async ({
  page,
  browser,
}) => {
  const user = await createVerifiedUser("securite", "Léa", "Sécurité");
  const phone = await browser.newContext({ userAgent: "NutrionApp iPhone (test)" });
  const phonePage = await phone.newPage();
  await consentDecided(phonePage);
  await signIn(phonePage, user, LABELS);
  await expect(phonePage).toHaveURL(/\/fr\/compte$/);

  await signIn(page, user, LABELS);
  await expect(page).toHaveURL(/\/fr\/compte$/);
  // Révocation de l'autre session depuis « Appareils connectés ».
  // (La confirmation de l'e-mail du compte de test a ouvert une session de plus, sans navigateur.)
  const devices = page.locator("#securite");
  const iphone = devices.getByRole("listitem").filter({ hasText: "iPhone" });
  await expect(iphone).toHaveCount(1);
  await expect(devices.getByText(fr.account.thisSession)).toHaveCount(1);
  await iphone.getByRole("button", { name: fr.account.revoke }).click();
  await expect(iphone).toHaveCount(0);
  expect((await phonePage.request.get("/api/v1/account/me")).status()).toBe(401);
  await phone.close();

  // Changement de mot de passe.
  const next = "Tout-Nouveau-2026";
  await devices.getByRole("button", { name: fr.account.changePassword }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(fr.account.currentPassword).fill(user.password);
  await dialog.getByLabel(fr.auth.newPassword).fill(next);
  await dialog.getByRole("button", { name: fr.common.save }).click();
  await expect(page.getByText(fr.common.saved).first()).toBeVisible();
  await page.request.post("/api/v1/auth/sign-out", { headers: { origin: SITE_ORIGIN } });
  await signIn(page, user, LABELS);
  await expect(page.locator("#signin-error")).toContainText(fr.auth.invalidCredentials);
  await signIn(page, { email: user.email, password: next }, LABELS);
  await expect(page).toHaveURL(/\/fr\/compte$/);
});

test("export ZIP : profil, adresses, panier et sessions dedans", async ({ page }) => {
  await signIn(page, CAMILLE, LABELS);
  await expect(page).toHaveURL(/\/fr\/compte$/);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: fr.account.export }).click();
  const path = await (await download).path();
  const listing = execFileSync("unzip", ["-Z1", path])
    .toString()
    .split("\n")
    .filter(Boolean)
    .sort();
  expect(listing).toEqual([
    "LISEZ-MOI.txt",
    "adresses.json",
    "panier.json",
    "profil.json",
    "sessions.json",
  ]);
  const profil = JSON.parse(execFileSync("unzip", ["-p", path, "profil.json"]).toString());
  expect(profil.email).toBe(CAMILLE.email);
  const adresses = JSON.parse(execFileSync("unzip", ["-p", path, "adresses.json"]).toString());
  expect(adresses.length).toBeGreaterThan(0);
});

test("suppression du compte : confirmation, déconnexion, connexion impossible ensuite", async ({
  page,
}) => {
  const user = await createVerifiedUser("supprime", "Yanis", "Départ");
  await signIn(page, user, LABELS);
  await expect(page).toHaveURL(/\/fr\/compte$/);
  await page.getByRole("button", { name: fr.account.deleteAccount }).click();
  const dialog = page.getByRole("dialog");
  const confirm = dialog.getByRole("button", { name: fr.account.deleteAccount });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel(fr.account.deleteConfirmInput).fill("SUPPRIMER");
  await confirm.click();
  await expect(page).not.toHaveURL(/\/compte$/);
  expect((await page.request.get("/api/v1/account/me")).status()).toBe(401);
  await signIn(page, user, LABELS);
  await expect(page.locator("#signin-error")).toContainText(fr.auth.invalidCredentials);
});

test("verrouillage après 5 échecs : message affiché, même avec le bon mot de passe", async ({
  page,
}) => {
  const user = await createVerifiedUser("verrou");
  for (let i = 0; i < 5; i++) {
    await signIn(page, { email: user.email, password: "Mauvais-mot-2026" }, LABELS);
    await expect(page.locator("#signin-error")).toBeVisible();
  }
  await signIn(page, user, LABELS);
  await expect(page.locator("#signin-error")).toContainText(fr.auth.locked);
});

test("panier : Rupture non ajoutable, plafond au stock, gardé après rechargement et fermeture", async ({
  browser,
}) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await consentDecided(page);
  // Produit entièrement en rupture : badge, bouton indisponible.
  await page.goto("/fr/boutique/recuperation-cacao");
  await expect(page.getByText(fr.common.outOfStock).first()).toBeVisible();
  await expect(page.getByRole("button", { name: fr.common.unavailable })).toBeDisabled();

  // Variante à 3 en stock : la quantité ne dépasse pas 3.
  await page.goto("/fr/boutique/avoine-cacao");
  await page.getByRole("button", { name: "Boîte de 12", exact: true }).click();
  const plus = page.getByRole("button", { name: fr.product.increase });
  for (let i = 0; i < 5; i++) if (await plus.isEnabled()) await plus.click();
  await expect(page.getByRole("group", { name: fr.product.quantity })).toContainText("3");
  await expect(plus).toBeDisabled();
  await page.getByRole("button", { name: fr.product.addToCart }).click();
  await expect(page.getByRole("status").filter({ hasText: /Ajouté au panier/ })).toBeVisible();

  await page.reload();
  await page.goto("/fr/panier");
  await expect(page.locator("main")).toContainText("Boîte de 12");

  // « Fermeture du navigateur » : un nouveau contexte avec les cookies gardés retrouve le panier.
  const state = await context.storageState();
  await context.close();
  const again = await browser.newContext({ storageState: state });
  const page2 = await again.newPage();
  await page2.goto("/fr/panier");
  await expect(page2.locator("main")).toContainText("Boîte de 12");
  await again.close();
});

test("panier : une variante désactivée au back-office est retirée, et c'est annoncé", async ({
  browser,
}) => {
  const shopper = await browser.newContext();
  const page = await shopper.newPage();
  await consentDecided(page);
  const detail = await (await page.request.get("/api/v1/catalog/products/vanille-amande")).json();
  const variant = detail.variants[0] as { id: string };
  const add = await page.request.post("/api/v1/cart/items", {
    data: { variantId: variant.id, quantity: 1 },
    headers: { origin: SITE_ORIGIN },
  });
  expect(add.status()).toBe(201);

  const adminCtx = await browser.newContext();
  const adminPage = await adminCtx.newPage();
  await adminSession(adminPage);
  const toggle = (isActive: boolean) =>
    adminPage.request.patch(`/api/v1/admin/products/${detail.id}/variants`, {
      data: { variants: [{ id: variant.id, isActive }] },
      headers: { origin: SITE_ORIGIN },
    });
  expect((await toggle(false)).ok()).toBe(true);
  try {
    await page.goto("/fr/panier");
    await expect(page.getByText(fr.cart.adjusted)).toBeVisible();
    await expect(page.getByText(fr.cart.empty)).toBeVisible();
  } finally {
    expect((await toggle(true)).ok()).toBe(true);
    await adminCtx.close();
    await shopper.close();
  }
});
