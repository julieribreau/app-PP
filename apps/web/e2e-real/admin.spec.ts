import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import fr from "@nutrion/i18n/messages/fr.json";

import { ADMIN, CAMILLE, consentDecided, signIn, totp, trackConsoleErrors } from "./support";

// Back-office contre la vraie stack. Les étapes s'enchaînent (2FA, usagers, catalogue,
// journal) : une seule session admin, partagée par les tests de ce fichier.
const LABELS = { email: fr.auth.email, password: fr.auth.password, submit: fr.auth.signIn };
// Secret TOTP de l'admin, gardé d'un passage à l'autre (hors dépôt, cf .gitignore) : la 2FA
// reste activée en base après le test, le passage suivant la désactive puis la réactive.
const STATE = join(__dirname, ".state", "admin-totp.json");
const SHOTS = process.env["E2E_SHOTS_DIR"];
const RUN = Date.now().toString(36);

test.describe.configure({ mode: "serial" });

let context: BrowserContext;
let page: Page;
let secret = "";

async function shot(name: string): Promise<void> {
  if (!SHOTS) return;
  mkdirSync(SHOTS, { recursive: true });
  for (const theme of ["light", "dark"] as const) {
    await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
    await page.screenshot({ path: join(SHOTS, `${name}-${theme}.png`), fullPage: true });
  }
  await page.evaluate(() => document.documentElement.removeAttribute("data-theme"));
}

/** Connexion admin, défi TOTP compris quand la 2FA est déjà active ; dit si elle l'était. */
async function adminSignIn(): Promise<boolean> {
  await signIn(page, ADMIN, LABELS);
  const challenge = page.getByRole("heading", { name: fr.auth.twoFactorTitle });
  await expect(
    challenge.or(page.getByRole("heading", { level: 1, name: fr.account.title })),
  ).toBeVisible();
  const challenged = await challenge.isVisible();
  if (challenged) {
    if (!secret)
      throw new Error(
        "2FA admin active sans secret connu : relancer `make seed` sur une base neuve",
      );
    await page.getByLabel(fr.auth.twoFactorCode).fill(totp(secret));
    await page.getByRole("button", { name: fr.auth.twoFactorVerify }).click();
  }
  await expect(page).toHaveURL(/\/fr\/compte$/);
  return challenged;
}

test.beforeAll(async ({ browser }) => {
  context = await browser.newContext({ locale: "fr-FR" });
  page = await context.newPage();
  await consentDecided(page);
  if (existsSync(STATE))
    secret = (JSON.parse(readFileSync(STATE, "utf8")) as { secret: string }).secret;
});

test.afterAll(async () => context.close());

test("un usager sans rôle admin est refusé au back-office", async ({ browser }) => {
  const other = await browser.newPage();
  await consentDecided(other);
  await signIn(other, CAMILLE, LABELS);
  await expect(other).toHaveURL(/\/fr\/compte$/);
  await other.goto("/fr/admin");
  await expect(other.getByRole("heading", { name: fr.admin.forbidden })).toBeVisible();
  const res = await other.request.get("/api/v1/admin/users");
  expect(res.status()).toBe(403);
  await other.close();
});

test("activation de la 2FA imposée, puis accès au back-office", async () => {
  const done = trackConsoleErrors(page);
  // Passage précédent (2FA active) : on repart d'un admin sans 2FA pour rejouer l'activation.
  // Base re-seedée : l'admin n'a plus de 2FA, l'ancien secret est simplement oublié.
  if (await adminSignIn()) {
    const off = await page.request.post("/api/v1/auth/two-factor/disable", {
      data: { password: ADMIN.password },
      headers: { origin: new URL(page.url()).origin },
    });
    expect(off.ok(), await off.text()).toBe(true);
    secret = "";
  }
  const api = await page.request.get("/api/v1/admin/users");
  expect(api.status()).toBe(403);
  expect((await api.json()).code).toBe("TWO_FACTOR_REQUIRED");

  await page.goto("/fr/admin");
  await expect(page.getByRole("heading", { name: fr.auth.twoFactorSetupTitle })).toBeVisible();
  await page.getByLabel(fr.auth.password, { exact: true }).fill(ADMIN.password);
  await page.getByRole("button", { name: fr.auth.twoFactorStart }).click();
  const key = page.getByTestId("tfa-secret");
  await expect(key).toHaveText(/^[A-Z2-7]{16,}$/);
  secret = (await key.textContent())!.trim();
  mkdirSync(dirname(STATE), { recursive: true });
  writeFileSync(STATE, JSON.stringify({ secret }));
  await shot("01-activation-2fa");
  await page.getByLabel(fr.auth.twoFactorCode).fill(totp(secret));
  await page.getByRole("button", { name: fr.auth.twoFactorVerify }).click();
  await expect(page.getByRole("navigation", { name: fr.admin.title })).toBeVisible();
  expect((await page.request.get("/api/v1/admin/users")).status()).toBe(200);
  done();
});

test("usagers : recherche, filtre, tri et pagination", async () => {
  const done = trackConsoleErrors(page);
  await page.goto("/fr/admin/usagers");
  const table = page.getByRole("table", { name: fr.admin.users });
  await expect(table.getByRole("row").nth(1)).toBeVisible();
  await shot("02-usagers");

  await page.getByLabel(fr.admin.searchUsers).fill("roux");
  await expect(page).toHaveURL(/q=roux/);
  await expect(table.getByRole("row")).toHaveCount(2);
  await expect(table).toContainText("manon.roux@exemple.fr");
  await page.getByRole("button", { name: fr.admin.reset }).click();

  await page.getByLabel(fr.admin.status).selectOption("suspended");
  await expect(page).toHaveURL(/status=suspended/);
  await expect(table).toContainText("nathan.garcia@exemple.fr");
  await expect(table.getByRole("row")).toHaveCount(2);
  await page.getByRole("button", { name: fr.admin.reset }).click();

  await table.getByRole("button", { name: fr.admin.col.user, exact: true }).click();
  await expect(page).toHaveURL(/sort=name/);
  const first = await table.getByRole("row").nth(1).innerText();
  await table.getByRole("button", { name: fr.admin.col.user, exact: true }).click();
  await expect(page).toHaveURL(/sort=name.*order=(asc|desc)|order=(asc|desc).*sort=name/);
  await expect(table.getByRole("row").nth(1)).not.toHaveText(first);

  const pagination = page.getByRole("navigation", { name: fr.admin.pagination });
  await pagination.getByRole("button", { name: "2" }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(table.getByRole("row").nth(1)).toBeVisible();
  done();
});

async function userAction(name: string, action: string, reason?: string): Promise<void> {
  await page.goto(`/fr/admin/usagers?q=${encodeURIComponent(name.split(" ")[0]!.toLowerCase())}`);
  await page.getByRole("button", { name: fr.admin.actionsFor.replace("{name}", name) }).click();
  await page.getByRole("menuitem", { name: action }).click();
  const dialog = page.getByRole("dialog");
  if (reason) await dialog.getByLabel(fr.admin.suspendReason).fill(reason);
  await dialog.getByRole("button", { name: action }).click();
  await expect(dialog).toBeHidden();
}

test("suspension (connexion refusée), réactivation et changement de rôle", async ({ browser }) => {
  const done = trackConsoleErrors(page);
  const table = page.getByRole("table", { name: fr.admin.users });
  await userAction("Sarah Dubois", fr.admin.suspend, "Essai bout en bout");
  await expect(table).toContainText(fr.admin.statuses.suspended);

  const sarah = await browser.newPage();
  await consentDecided(sarah);
  await signIn(sarah, { email: "sarah.dubois@exemple.fr", password: CAMILLE.password }, LABELS);
  await expect(sarah.locator("#signin-error")).not.toBeEmpty();
  await expect(sarah).toHaveURL(/\/fr\/connexion/);

  await userAction("Sarah Dubois", fr.admin.reactivate);
  await expect(table).toContainText(fr.admin.statuses.active);
  await signIn(sarah, { email: "sarah.dubois@exemple.fr", password: CAMILLE.password }, LABELS);
  await expect(sarah).toHaveURL(/\/fr\/compte$/);
  await sarah.close();

  await userAction("Hugo Lefèvre", fr.admin.makeAdmin);
  await expect(table).toContainText(fr.admin.roles.admin);
  await userAction("Hugo Lefèvre", fr.admin.makeUser);
  await expect(table.getByText(fr.admin.roles.admin, { exact: true })).toHaveCount(0);
  done();
});

const CATEGORY = { fr: `Compotes ${RUN}`, en: `Fruit purees ${RUN}`, slug: `compotes-${RUN}` };
const PRODUCT = { fr: `Compote pomme ${RUN}`, en: `Apple puree ${RUN}` };

test("création d'une catégorie", async () => {
  const done = trackConsoleErrors(page);
  await page.goto("/fr/admin/categories");
  await page.getByRole("button", { name: fr.admin.newCategory }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(`${fr.admin.name} (FR)`).fill(CATEGORY.fr);
  await dialog.getByLabel(`${fr.admin.name} (EN)`).fill(CATEGORY.en);
  await dialog.getByLabel(fr.admin.slug).fill(CATEGORY.slug);
  await dialog.getByRole("button", { name: fr.common.save }).click();
  await expect(page.getByRole("table", { name: fr.admin.categories })).toContainText(CATEGORY.fr);
  done();
});

test("produit FR/EN, axes saveur × format, variantes, mise en vente puis archivage", async () => {
  const done = trackConsoleErrors(page);
  await page.goto("/fr/admin/produits/nouveau");
  await page.getByLabel(`${fr.admin.name} (FR)`).fill(PRODUCT.fr);
  await page.getByLabel(fr.admin.col.category).selectOption({ label: CATEGORY.fr });
  await page.getByLabel(`${fr.admin.summary} (FR)`).fill("Pomme du Limousin, sans sucre ajouté.");
  await page
    .getByRole("textbox", { name: `${fr.admin.description} (FR)` })
    .fill("Une compote douce, en gourde.");
  await page.getByLabel(fr.admin.priceTtc).fill("1,90");
  const lang = page.getByRole("radiogroup", { name: fr.admin.contentLanguage });
  await lang.getByRole("radio", { name: fr.locale.en }).click();
  await page.getByLabel(`${fr.admin.name} (EN)`).fill(PRODUCT.en);
  await page.getByLabel(`${fr.admin.summary} (EN)`).fill("Limousin apples, no added sugar.");
  await lang.getByRole("radio", { name: fr.locale.fr }).click();
  await page.getByRole("button", { name: fr.admin.save }).click();
  await expect(page).toHaveURL(/\/fr\/admin\/produits\/[0-9a-f-]{36}$/);

  // Axes : saveur (pomme, poire) × format (gourde, pack de 4)
  const addAxis = async (name: string, values: string[]) => {
    await page.getByRole("button", { name: fr.admin.addAxis }).click();
    await page.getByLabel(fr.admin.axisName).last().fill(name);
    const input = page.getByLabel(`${fr.admin.newValue} · ${name}`);
    for (const v of values) {
      await input.fill(v);
      await input.press("Enter");
    }
  };
  await addAxis("Saveur", ["Pomme", "Poire"]);
  await addAxis("Format", ["Gourde", "Pack de 4"]);
  await page.getByRole("button", { name: fr.admin.save }).click();
  const variants = page.getByRole("table", { name: fr.admin.variants });
  await expect(variants.getByRole("row")).toHaveCount(5);

  const field = (kind: "variantPrice" | "variantStock", label: string) =>
    page.getByLabel(fr.admin[kind].replace("{label}", label));
  await field("variantPrice", "Pomme · Pack de 4").fill("6,90");
  await field("variantPrice", "Poire · Pack de 4").fill("6,90");
  await field("variantStock", "Pomme · Gourde").fill("40");
  await field("variantStock", "Poire · Gourde").fill("0");
  await page.getByLabel(fr.admin.status).selectOption("active");
  await page.getByRole("button", { name: fr.admin.save }).click();
  await expect(page.getByRole("link", { name: fr.admin.viewInShop })).toBeVisible();
  await page.reload();
  await expect(field("variantPrice", "Pomme · Pack de 4")).toHaveValue(/6,90/);
  await expect(field("variantStock", "Poire · Gourde")).toHaveValue("0");
  await shot("03-fiche-produit-variantes");

  // Côté boutique : visible, avec ses variantes et son prix
  await page.getByRole("link", { name: fr.admin.viewInShop }).click();
  await expect(page.getByRole("heading", { level: 1, name: PRODUCT.fr })).toBeVisible();
  await expect(page.getByRole("button", { name: "Pack de 4" })).toBeVisible();
  await expect(page.getByText("1,90").first()).toBeVisible();
  const slug = new URL(page.url()).pathname.split("/").pop()!;
  await page.goto(`/fr/boutique?category=${CATEGORY.slug}`);
  await expect(page.getByRole("heading", { name: PRODUCT.fr })).toBeVisible();
  await shot("04-boutique-nouveau-produit");
  await page.goto(`/en/boutique/${slug}`);
  await expect(page.getByRole("heading", { level: 1, name: PRODUCT.en })).toBeVisible();

  // Archivage : il disparaît de la boutique
  await page.goto("/fr/admin/produits");
  await page.getByRole("link", { name: PRODUCT.fr }).click();
  // La liste a aussi un filtre « Statut » : attendre l'éditeur avant de le chercher.
  await expect(page.getByRole("button", { name: fr.admin.save })).toBeVisible();
  await page.getByLabel(fr.admin.status).selectOption("archived");
  await page.getByRole("button", { name: fr.admin.save }).click();
  await expect(page.getByText(fr.admin.productStatus.archived).first()).toBeVisible();
  await page.goto(`/fr/boutique/${slug}`);
  await expect(page.getByText(fr.product.notFound)).toBeVisible();
  await page.goto(`/fr/boutique?category=${CATEGORY.slug}`);
  await expect(page.getByRole("heading", { name: PRODUCT.fr })).toHaveCount(0);
  done();
});

test("le journal d'audit liste les actions de l'admin", async () => {
  const done = trackConsoleErrors(page);
  await page.goto("/fr/admin/journal");
  const table = page.getByRole("table", { name: fr.admin.audit });
  await expect(table.getByRole("row").nth(1)).toBeVisible();
  const text = await table.innerText();
  // Actions traduites, plus jamais le code brut (cf finition-site : /en sans clé brute).
  const labels = fr.admin.auditActions;
  for (const label of [
    labels.account_suspend,
    labels.account_reactivate,
    labels.account_role,
    labels.catalog_category_create,
    labels.catalog_product_create,
  ]) {
    expect(text, `action ${label}`).toContain(label);
  }
  await shot("05-journal");
  done();
});

test("déconnexion puis reconnexion admin avec défi TOTP", async () => {
  await page.goto("/fr/admin");
  await page.getByRole("button", { name: fr.auth.signOut }).click();
  await expect(page).toHaveURL(/\/fr\/connexion/);
  expect((await page.request.get("/api/v1/admin/users")).status()).toBe(401);
  await signIn(page, ADMIN, LABELS);
  await expect(page.getByRole("heading", { name: fr.auth.twoFactorTitle })).toBeVisible();
  // Mauvais code refusé, bon code accepté (on attend la fenêtre suivante si besoin)
  await page.getByLabel(fr.auth.twoFactorCode).fill("000000");
  await page.getByRole("button", { name: fr.auth.twoFactorVerify }).click();
  await expect(page.getByText(fr.auth.invalidCode)).toBeVisible();
  await page.getByLabel(fr.auth.twoFactorCode).fill(totp(secret));
  await page.getByRole("button", { name: fr.auth.twoFactorVerify }).click();
  await expect(page).toHaveURL(/\/fr\/compte$/);
  await page.goto("/fr/admin/usagers");
  await expect(page.getByRole("heading", { level: 1, name: fr.admin.users })).toBeVisible();
});
