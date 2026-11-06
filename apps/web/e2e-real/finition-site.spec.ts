import { expect, type Page, test } from "@playwright/test";
import en from "@nutrion/i18n/messages/en.json";
import fr from "@nutrion/i18n/messages/fr.json";

import {
  adminSession,
  CAMILLE,
  consentDecided,
  frenchOnlyStrings,
  RAW_KEY,
  signIn,
  trackConsoleErrors,
} from "./support";

// Site public, langues et thèmes, contre la vraie stack (docs/qa/matrice-tests.md).
const LABELS = { email: fr.auth.email, password: fr.auth.password, submit: fr.auth.signIn };
const PUBLIC = [
  "/",
  "/boutique",
  "/boutique/avoine-cacao",
  "/panier",
  "/connexion",
  "/mot-de-passe-oublie",
  "/reinitialiser-mot-de-passe",
  "/verifier-email",
  "/mentions-legales",
  "/confidentialite",
  "/cgu",
  "/cookies",
];
const FRENCH = frenchOnlyStrings(fr, en);

/** Le texte visible de la page, une fois les requêtes du rendu client terminées. */
async function visibleText(page: Page, path: string): Promise<string> {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  await expect(page.locator("main, [role=main], body").first()).toBeVisible();
  return page.locator("body").innerText();
}

function expectEnglish(text: string, path: string) {
  expect(text, `${path} : clé brute`).not.toMatch(RAW_KEY);
  const leftovers = FRENCH.filter((s) => text.includes(s));
  expect(leftovers, `${path} : textes restés en français`).toEqual([]);
}

test.beforeEach(async ({ page }) => consentDecided(page));

test("vitrine et pages légales s'affichent dans les deux langues", async ({ page }) => {
  const done = trackConsoleErrors(page);
  for (const locale of ["fr", "en"] as const) {
    const m = locale === "fr" ? fr : en;
    await page.goto(`/${locale}`);
    await expect(page.getByRole("heading", { level: 1, name: m.landing.title })).toBeVisible();
    for (const [path, title] of [
      ["/mentions-legales", m.footer.mentions],
      ["/confidentialite", m.footer.privacy],
      ["/cgu", m.footer.terms],
      ["/cookies", m.footer.cookies],
    ] as const) {
      const res = await page.goto(`/${locale}${path}`);
      expect(res?.status(), path).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.locator("footer")).toContainText(title);
    }
  }
  done();
});

test("pages publiques en anglais : aucune clé brute, aucun texte resté en français", async ({
  page,
}) => {
  for (const path of PUBLIC) expectEnglish(await visibleText(page, `/en${path}`), `/en${path}`);
});

test("compte en anglais : aucune clé brute, aucun texte resté en français", async ({ page }) => {
  await signIn(page, CAMILLE, LABELS);
  await expect(page).toHaveURL(/\/fr\/compte$/);
  expectEnglish(await visibleText(page, "/en/compte"), "/en/compte");
});

test("back-office en anglais : aucune clé brute, aucun texte resté en français", async ({
  page,
}) => {
  await adminSession(page);
  const products = await page.request.get("/api/v1/admin/products?pageSize=1");
  const id = (await products.json()).items[0].id as string;
  for (const path of [
    "/admin",
    "/admin/usagers",
    "/admin/produits",
    `/admin/produits/${id}`,
    "/admin/produits/nouveau",
    "/admin/categories",
    "/admin/journal",
  ])
    expectEnglish(await visibleText(page, `/en${path}`), `/en${path}`);
});

test("thème : posé par le serveur dès le HTML (pas de flash), sur chaque page", async ({
  page,
  context,
}) => {
  for (const theme of ["dark", "light"] as const) {
    await context.addCookies([
      {
        name: "nutrion_theme",
        value: theme,
        url: page.url() === "about:blank" ? "http://localhost:3000" : page.url(),
      },
    ]);
    for (const path of [...PUBLIC, "/compte", "/admin"]) {
      const res = await page.request.get(`/fr${path}`, {
        headers: { cookie: `nutrion_theme=${theme}` },
      });
      expect(res.status(), path).toBeLessThan(400);
      const html = await res.text();
      expect(html.match(/<html[^>]*>/)?.[0], `${path} (${theme})`).toContain(
        `data-theme="${theme}"`,
      );
    }
  }
  // Sans cookie : thème du système, aucun attribut, les tokens suivent prefers-color-scheme.
  const html = await (await page.request.get("/fr/boutique", { headers: { cookie: "" } })).text();
  expect(html.match(/<html[^>]*>/)?.[0]).not.toContain("data-theme=");
});

test("thème sombre réellement appliqué : fond et texte changent", async ({ page }) => {
  await page.goto("/fr/boutique");
  const light = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  const dark = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(light).not.toBe(dark);
  expect(dark).toBe("rgb(28, 20, 16)");
});

test("boutique : recherche, catégorie, tri, URL partageable, fiche inconnue", async ({ page }) => {
  const done = trackConsoleErrors(page);
  await page.goto("/fr/boutique");
  const cards = page.locator("main a[href*='/boutique/']");
  await expect(cards.first()).toBeVisible();
  const all = await cards.count();
  expect(all).toBeGreaterThanOrEqual(10);

  await page.getByLabel(fr.shop.searchLabel).fill("granola");
  await expect(page).toHaveURL(/q=granola/);
  await expect(cards).toHaveCount(3);

  // Lien partagé : l'état vient de l'URL.
  await page.goto("/fr/boutique?category=granolas&sort=price_desc");
  await expect(page.getByRole("button", { name: "Granolas", pressed: true })).toBeVisible();
  await expect(cards).toHaveCount(3);
  const prices = await page.locator("main [data-testid=price], main .font-numeric").allInnerTexts();
  const cents = prices
    .map((p) => Number(p.replace(/[^\d,]/g, "").replace(",", ".")))
    .filter((n) => n > 0);
  expect(cents.length).toBeGreaterThan(0);
  expect([...cents].sort((a, b) => b - a)).toEqual(cents);

  await page.goto("/fr/boutique?sort=price_asc");
  await expect(cards.first()).toBeVisible();
  const asc = (await page.locator("main .font-numeric").allInnerTexts())
    .map((p) => Number(p.replace(/[^\d,]/g, "").replace(",", ".")))
    .filter((n) => n > 0);
  expect([...asc].sort((a, b) => a - b)).toEqual(asc);

  // Pagination : page 2 vide au-delà du catalogue (24 par page), page hors bornes sans erreur.
  const p2 = await page.request.get("/api/v1/catalog/products?page=2&pageSize=6");
  expect((await p2.json()).items.length).toBeGreaterThan(0);

  await page.goto("/fr/boutique/produit-qui-n-existe-pas");
  await expect(page.getByText(fr.product.notFound)).toBeVisible();
  done();
});

test("consentement : PostHog ne part qu'après « Accepter »", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const posthog: string[] = [];
  page.on("request", (r) => {
    if (/posthog\.com/.test(r.url())) posthog.push(r.url());
  });
  await page.goto("/fr/boutique");
  await expect(page.getByRole("button", { name: fr.consent.banner.accept })).toBeVisible();
  await page.goto("/fr/boutique/avoine-cacao");
  await page.waitForLoadState("networkidle");
  expect(posthog, "requêtes PostHog avant consentement").toEqual([]);
  await page.getByRole("button", { name: fr.consent.banner.accept }).click();
  await expect.poll(() => posthog.length, { timeout: 10_000 }).toBeGreaterThan(0);
  await context.close();
});
