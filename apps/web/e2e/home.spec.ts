import { expect, test } from "@playwright/test";
import en from "@nutrion/i18n/messages/en.json";
import fr from "@nutrion/i18n/messages/fr.json";

// La page d'accueil, servie dans chaque langue, avec la langue du document qui suit
// l'URL (RGAA 8.3).
for (const [locale, messages] of [
  ["fr", fr],
  ["en", en],
] as const) {
  test(`accueil en ${locale}`, async ({ page }) => {
    const reponse = await page.goto(`/${locale}`);
    expect(reponse?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(messages.landing.title);
    await expect(page.getByRole("link", { name: messages.landing.cta })).toBeVisible();
  });
}

// La racine suit la langue du navigateur (socle §i18n : préférence > navigateur > défaut).
for (const [langueNavigateur, attendue] of [
  ["fr-FR", "fr"],
  ["en-US", "en"],
] as const) {
  test.describe(`navigateur en ${langueNavigateur}`, () => {
    test.use({ locale: langueNavigateur });

    test(`la racine mène à /${attendue}`, async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveURL(new RegExp(`/${attendue}$`));
    });
  });
}
