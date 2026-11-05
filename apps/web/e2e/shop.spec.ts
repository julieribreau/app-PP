import { expect, test } from "@playwright/test";
import fr from "@nutrion/i18n/messages/fr.json";

import { consentDecided, mockApi } from "./fixtures/api";

// Parcours d'achat d'un invité, API simulée : boutique → fiche → choix de variante → panier.
test.beforeEach(async ({ page }) => consentDecided(page));

test("boutique → fiche → ajout au panier → panier", async ({ page }) => {
  const api = await mockApi(page);
  await page.goto("/fr/boutique");
  await expect(page.getByRole("heading", { level: 1, name: fr.shop.title })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Avoine & cacao" })).toBeVisible();
  // Seul badge de stock : « Rupture ».
  await expect(page.getByText(fr.common.outOfStock)).toHaveCount(1);

  await page.getByRole("link", { name: /Avoine & cacao/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Avoine & cacao" })).toBeVisible();
  await page.getByRole("button", { name: "Boîte de 12" }).click();
  await expect(page.getByRole("button", { name: "Boîte de 12" })).toHaveAttribute("aria-pressed", "true");
  // Stock de 3 : la quantité plafonne à 3.
  const plus = page.getByRole("button", { name: fr.product.increase });
  await plus.click();
  await plus.click();
  await expect(plus).toBeDisabled();
  await page.getByRole("button", { name: fr.product.addToCart }).click();
  await expect(page.getByRole("status").filter({ hasText: "3 × Cacao · Boîte de 12" })).toBeVisible();
  expect(api.calls).toContain("POST /v1/cart/items");

  await page.getByRole("link", { name: fr.product.viewCart }).click();
  await expect(page.getByRole("heading", { level: 1, name: fr.cart.title })).toBeVisible();
  await expect(page.getByRole("note")).toContainText(fr.cart.guestNote);
  await expect(page.getByRole("button", { name: fr.cart.checkout })).toBeDisabled();
  await expect(page.getByRole("complementary")).toContainText("89,70");
});

test("filtre par catégorie dans l'URL", async ({ page }) => {
  await mockApi(page);
  await page.goto("/fr/boutique");
  await page.getByRole("button", { name: "Granolas" }).click();
  await expect(page).toHaveURL(/category=granolas/);
  await expect(page.getByRole("heading", { name: "Noisette & sarrasin" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Avoine & cacao" })).toBeHidden();
});
