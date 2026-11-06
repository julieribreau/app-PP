import { execFileSync } from "node:child_process";
import { join } from "node:path";

import { expect, type Page, test } from "@playwright/test";
import fr from "@nutrion/i18n/messages/fr.json";

import {
  adminSession,
  consentDecided,
  createVerifiedUser,
  SITE_ORIGIN,
  signIn,
  totp,
  trackConsoleErrors,
} from "./support";

// Back-office contre la vraie stack : chiffres, exports, rôles, garde-fous, photo et
// description des produits (docs/qa/matrice-tests.md).
const LABELS = { email: fr.auth.email, password: fr.auth.password, submit: fr.auth.signIn };
const FIXTURES = join(__dirname, "fixtures");
const H = { origin: SITE_ORIGIN };

test.describe.configure({ mode: "serial" });

let admin: Page;

test.beforeAll(async ({ browser }) => {
  admin = await (await browser.newContext({ acceptDownloads: true })).newPage();
  await consentDecided(admin);
  await adminSession(admin);
});
test.afterAll(async () => admin.context().close());

async function api<T>(path: string): Promise<T> {
  const res = await admin.request.get(`/api${path}`);
  expect(res.ok(), path).toBe(true);
  return (await res.json()) as T;
}

test("tableau de bord : les chiffres sont ceux de la base", async () => {
  const done = trackConsoleErrors(admin);
  const users = await api<{ counts: { total: number; unverified: number; suspended: number } }>(
    "/v1/admin/users?pageSize=10",
  );
  const products = await api<{ total: number }>("/v1/admin/products?pageSize=1");
  await admin.goto("/fr/admin");
  const stat = (label: string) =>
    admin.locator("main a").filter({ hasText: label }).locator(".font-numeric");
  await expect(stat(fr.admin.users)).toHaveText(String(users.counts.total));
  await expect(stat(fr.admin.statuses.unverified)).toHaveText(String(users.counts.unverified));
  await expect(stat(fr.admin.products)).toHaveText(String(products.total));
  done();
});

test("export CSV des usagers : en-têtes et une ligne par compte", async () => {
  const { counts } = await api<{ counts: { total: number } }>("/v1/admin/users?pageSize=10");
  await admin.goto("/fr/admin/usagers");
  const download = admin.waitForEvent("download");
  await admin.getByRole("button", { name: fr.admin.export }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/\.csv$/);
  const csv = execFileSync("cat", [await file.path()])
    .toString()
    .replace(/^\uFEFF/, "");
  const lines = csv.trim().split(/\r?\n/);
  expect(lines[0]).toMatch(/e-?mail/i);
  expect(lines.length - 1).toBe(counts.total);
  expect(csv).toContain("admin@nutrion.local");
});

test("un admin ne peut ni se suspendre ni se rétrograder", async () => {
  await admin.goto("/fr/admin/usagers?q=admin%40nutrion.local");
  await admin
    .getByRole("button", { name: /Actions pour/ })
    .first()
    .click();
  for (const item of await admin.getByRole("menuitem").all())
    await expect(item).toHaveAttribute("aria-disabled", "true");
  await admin.keyboard.press("Escape");
  const me = await api<{ id: string }>("/v1/account/me");
  const res = await admin.request.patch(`/api/v1/admin/users/${me.id}/role`, {
    data: { role: "user" },
    headers: H,
  });
  expect(res.status()).toBeGreaterThanOrEqual(400);
});

test("usager promu admin : 2FA imposée, codes de secours utilisables une fois", async ({
  browser,
}) => {
  const user = await createVerifiedUser("promu", "Nathan", "Promu");
  const page = await (await browser.newContext()).newPage();
  await consentDecided(page);
  // Promotion par le back-office.
  await admin.goto(`/fr/admin/usagers?q=${encodeURIComponent(user.email)}`);
  await admin
    .getByRole("button", { name: /Actions pour/ })
    .first()
    .click();
  await admin.getByRole("menuitem", { name: fr.admin.makeAdmin }).click();
  await admin.getByRole("dialog").getByRole("button", { name: fr.admin.makeAdmin }).click();
  await expect(admin.getByRole("dialog")).toHaveCount(0);

  // Le nouvel admin doit activer sa 2FA avant d'entrer.
  await signIn(page, user, LABELS);
  await expect(page).toHaveURL(/\/fr\/compte$/);
  await page.goto("/fr/admin");
  await expect(page.getByRole("heading", { name: fr.auth.twoFactorSetupTitle })).toBeVisible();
  await page.getByLabel(fr.auth.password, { exact: true }).fill(user.password);
  await page.getByRole("button", { name: fr.auth.twoFactorStart }).click();
  const secret = (await page.getByTestId("tfa-secret").textContent())!.trim();
  const codes = await page
    .getByText(fr.auth.twoFactorBackupCodes)
    .locator("..")
    .getByRole("listitem")
    .allInnerTexts();
  expect(codes.length).toBeGreaterThanOrEqual(8);
  await page.getByLabel(fr.auth.twoFactorCode).fill(totp(secret));
  await page.getByRole("button", { name: fr.auth.twoFactorVerify }).click();
  await expect(page.getByRole("navigation", { name: fr.admin.title })).toBeVisible();

  // Reconnexion avec un code de secours, puis le même code refusé.
  for (const attempt of ["ok", "reused"] as const) {
    await page.context().clearCookies();
    await signIn(page, user, LABELS);
    await expect(page.getByRole("heading", { name: fr.auth.twoFactorTitle })).toBeVisible();
    await page.getByRole("button", { name: fr.auth.useBackupCode }).click();
    await page.getByLabel(fr.auth.backupCode).fill(codes[0]!);
    await page.getByRole("button", { name: fr.auth.twoFactorVerify }).click();
    if (attempt === "ok") await expect(page).toHaveURL(/\/fr\/compte$/);
    else await expect(page.getByText(fr.auth.invalidCode)).toBeVisible();
  }
  await page.context().close();
});

test("catégorie avec produits : suppression impossible", async () => {
  await admin.goto("/fr/admin/categories");
  const row = admin.getByRole("row").filter({ hasText: "Barres céréales" });
  await expect(row.getByRole("button", { name: fr.common.delete })).toBeDisabled();
  const cats = await api<{ id: string; productCount: number }[]>("/v1/admin/categories");
  const full = cats.find((c) => c.productCount > 0)!;
  const res = await admin.request.delete(`/api/v1/admin/categories/${full.id}`, { headers: H });
  expect(res.status()).toBe(409);
});

test("produit : photo envoyée, visible en boutique et sur la fiche, refus d'un faux fichier, retrait", async () => {
  const done = trackConsoleErrors(admin);
  const { items } = await api<{ items: { id: string; slug: string }[] }>(
    "/v1/admin/products?q=electrolytes",
  );
  const p = items[0]!;
  await admin.goto(`/fr/admin/produits/${p.id}`);
  const card = admin.locator("section[aria-labelledby=pi-title]");
  await card.locator("input[type=file]").setInputFiles(join(FIXTURES, "barre.png"));
  const preview = card.locator("img");
  await expect(preview).toBeVisible();
  await expect.poll(() => preview.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBe(400);

  // Visible côté client : liste et fiche (l'image vient du stockage objet).
  const shop = await (await admin.context().browser()!.newContext()).newPage();
  await consentDecided(shop);
  await shop.goto("/fr/boutique?q=electrolytes");
  const listImg = shop.locator(`main a[href$='/boutique/${p.slug}'] img`);
  await expect.poll(() => listImg.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBe(400);
  await shop.goto(`/fr/boutique/${p.slug}`);
  const ficheImg = shop.locator("main img").first();
  await expect.poll(() => ficheImg.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBe(400);

  // Un fichier texte nommé .png est refusé, l'ancienne photo reste.
  await card.locator("input[type=file]").setInputFiles({
    name: "faux.png",
    mimeType: "image/png",
    buffer: Buffer.from("<svg onload=alert(1)>"),
  });
  await expect(admin.getByText(fr.admin.imageHelp).last()).toBeVisible();
  await expect(preview).toBeVisible();

  // Retrait : la fiche client repasse au visuel de remplacement.
  await card.getByRole("button", { name: fr.common.delete }).click();
  await expect(card.locator("img")).toHaveCount(0);
  await shop.reload();
  await expect(shop.locator("main img")).toHaveCount(0);
  await shop.context().close();
  done();
});

test("description riche enregistrée ; un script injecté ne s'exécute pas en boutique", async () => {
  // Une catégorie active (celles créées par d'autres tests peuvent être désactivées).
  const cats = await api<{ id: string; slug: string }[]>("/v1/admin/categories");
  const created = await admin.request.post("/api/v1/admin/products", {
    headers: H,
    data: {
      categoryId: cats.find((c) => c.slug === "barres-cereales")!.id,
      name: { fr: `Barre riche ${Date.now()}`, en: "Rich bar" },
      summary: { fr: "Résumé", en: "Summary" },
      description: { fr: "<p>Avant</p>", en: "<p>Before</p>" },
      priceCents: 300,
      vatRateBps: 550,
      status: "draft",
    },
  });
  expect(created.status()).toBe(201);
  const product = (await created.json()) as { id: string; slug: string };
  await admin.goto(`/fr/admin/produits/${product.id}`);
  const editor = admin.locator("[contenteditable=true]");
  await editor.click();
  await admin.keyboard.press("ControlOrMeta+a");
  await admin.keyboard.type("Moelleuse et ");
  await admin.keyboard.press("ControlOrMeta+b");
  await admin.keyboard.type("croquante");
  await admin.getByRole("combobox", { name: fr.admin.status }).selectOption("active");
  await admin.getByRole("button", { name: fr.admin.save }).click();
  await expect(admin.getByText(fr.common.saved).first()).toBeVisible();
  const saved = await api<{ description: { fr: string }; status: string }>(
    `/v1/admin/products/${product.id}`,
  );
  expect(saved.description.fr).toContain("<strong>croquante</strong>");
  expect(saved.status).toBe("active");

  // Injection directe par l'API : nettoyée à l'écriture, rien ne s'exécute à l'affichage.
  await admin.request.patch(`/api/v1/admin/products/${product.id}`, {
    headers: H,
    data: {
      description: {
        fr: '<p>ok</p><script>window.__xss=1</script><img src=x onerror="window.__xss=2">',
        en: "<p>ok</p>",
      },
    },
  });
  const shop = await (await admin.context().browser()!.newContext()).newPage();
  await consentDecided(shop);
  await shop.goto(`/fr/boutique/${product.slug}`);
  await expect(shop.getByText("ok", { exact: true })).toBeVisible();
  expect(
    await shop.evaluate(() => (window as unknown as { __xss?: number }).__xss),
  ).toBeUndefined();
  expect(await shop.locator("main script, main img[onerror]").count()).toBe(0);
  await shop.context().close();

  // Suppression : autorisée tant que le produit n'est dans aucun panier.
  await admin.goto(`/fr/admin/produits/${product.id}`);
  await admin.getByRole("button", { name: fr.admin.deleteProduct }).click();
  await admin.getByRole("dialog").getByRole("button", { name: fr.common.delete }).click();
  await expect(admin).toHaveURL(/\/fr\/admin\/produits$/);
  expect((await admin.request.get(`/api/v1/admin/products/${product.id}`)).status()).toBe(404);
});

test("produit dans un panier : suppression refusée, avec le conseil d'archiver", async ({
  browser,
}) => {
  const shopper = await (await browser.newContext()).newPage();
  const detail = await (
    await shopper.request.get("/api/v1/catalog/products/puree-cacahuete")
  ).json();
  const add = await shopper.request.post("/api/v1/cart/items", {
    headers: H,
    data: { variantId: detail.variants[0].id, quantity: 1 },
  });
  expect(add.status()).toBe(201);
  await admin.goto(`/fr/admin/produits/${detail.id}`);
  await admin.getByRole("button", { name: fr.admin.deleteProduct }).click();
  await admin.getByRole("dialog").getByRole("button", { name: fr.common.delete }).click();
  await expect(admin.getByText(fr.admin.deleteProductInCart)).toBeVisible();
  expect((await admin.request.get(`/api/v1/admin/products/${detail.id}`)).status()).toBe(200);
  await shopper.context().close();
});
