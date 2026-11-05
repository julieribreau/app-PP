import { expect, test } from "@playwright/test";
import fr from "@nutrion/i18n/messages/fr.json";

import { admin, camille, consentDecided, mockApi } from "./fixtures/api";

test.beforeEach(async ({ page }) => consentDecided(page));

test("admin avec 2FA : liste des usagers, tri et pagination", async ({ page }) => {
  await mockApi(page, { user: admin });
  await page.goto("/fr/admin/usagers");
  await expect(page.getByRole("heading", { level: 1, name: fr.admin.users })).toBeVisible();
  const table = page.getByRole("table", { name: fr.admin.users });
  await expect(table.getByRole("row")).toHaveCount(11); // en-tête + 10 lignes
  await table.getByRole("button", { name: fr.admin.col.createdAt }).click();
  await expect(page).toHaveURL(/order=asc/);
  await page.getByRole("navigation", { name: fr.admin.pagination }).getByRole("button", { name: "2" }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(table.getByRole("row")).toHaveCount(3);
});

test("admin sans 2FA : activation imposée avant le back-office", async ({ page }) => {
  await mockApi(page, { user: { ...admin, twoFactorEnabled: false } });
  await page.goto("/fr/admin/usagers");
  await expect(page.getByRole("heading", { name: fr.auth.twoFactorSetupTitle })).toBeVisible();
});

test("usager sans rôle admin : accès refusé", async ({ page }) => {
  await mockApi(page, { user: camille });
  await page.goto("/fr/admin");
  await expect(page.getByRole("heading", { name: fr.admin.forbidden })).toBeVisible();
});
