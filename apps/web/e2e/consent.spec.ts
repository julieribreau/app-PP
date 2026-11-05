import { expect, test, type Page } from "@playwright/test";
import fr from "@nutrion/i18n/messages/fr.json";

// Rien ne part vers PostHog avant le oui de l'usager, et plus rien après son retrait (politique
// cookies §3). Chaque requête vers un domaine PostHog est interceptée, comptée, et reçoit une
// réponse factice : le test ne parle jamais au vrai service.
const POSTHOG = /^https:\/\/[^/]*posthog\.com\//;

async function espionnerPostHog(page: Page): Promise<string[]> {
  const urls: string[] = [];
  await page.route(POSTHOG, async (route) => {
    urls.push(route.request().url());
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
  return urls;
}

// PostHog écarte les visites de navigateurs pilotés (navigator.webdriver, marque « Headless »)
// sans rien envoyer : le test se présente comme un navigateur ordinaire, sinon « des requêtes
// partent après Accepter » ne prouverait rien.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    Object.defineProperty(navigator, "userAgentData", { get: () => undefined });
  });
});

const evenements = (urls: string[]) =>
  urls.filter((url) => /\.posthog\.com\/(i\/v0\/)?e\//.test(url));

const banner = (page: Page) => page.getByRole("dialog", { name: fr.consent.banner.title });
const manager = (page: Page) => page.getByRole("dialog", { name: fr.consent.manager.title });

test("aucune requête PostHog avant le consentement, puis elles partent après « Accepter »", async ({
  page,
}) => {
  const urls = await espionnerPostHog(page);
  await page.goto("/fr");
  await expect(banner(page)).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect(urls).toEqual([]);

  await page.getByRole("button", { name: fr.consent.banner.accept, exact: true }).click();
  await expect(banner(page)).toBeHidden();
  // Un événement (la page vue courante) part vers l'ingestion de l'instance UE.
  await expect.poll(() => evenements(urls).length).toBeGreaterThan(0);
  expect(evenements(urls).every((url) => url.startsWith("https://eu.i.posthog.com/"))).toBe(true);
});

test("« Refuser » : rien ne part, ni maintenant ni à la visite suivante", async ({ page }) => {
  const urls = await espionnerPostHog(page);
  await page.goto("/fr");
  await page.getByRole("button", { name: fr.consent.banner.reject, exact: true }).click();
  await expect(banner(page)).toBeHidden();

  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(banner(page)).toBeHidden();
  expect(urls).toEqual([]);
});

test("« Gérer mes cookies » rouvre le gestionnaire au clavier ; le retrait coupe la mesure", async ({
  page,
}) => {
  const urls = await espionnerPostHog(page);
  await page.goto("/fr");
  await page.getByRole("button", { name: fr.consent.banner.accept, exact: true }).click();
  await expect.poll(() => evenements(urls).length).toBeGreaterThan(0);

  const link = page.getByRole("button", { name: fr.consent.settingsLink });
  await link.focus();
  await page.keyboard.press("Enter");
  await expect(manager(page)).toBeVisible();
  const box = page.getByRole("checkbox", { name: fr.consent.purposes.analytics.label });
  await expect(box).toBeChecked();
  await box.focus();
  await page.keyboard.press("Space");
  await expect(box).not.toBeChecked();
  await page.getByRole("button", { name: fr.consent.manager.save }).press("Enter");
  await expect(manager(page)).toBeHidden();
  await expect(link).toBeFocused();
  const auRetrait = urls.length;

  // Ce que le SDK gardait sur l'appareil est effacé ; seule reste la preuve du choix.
  const traces = await page.evaluate(() =>
    Object.keys(localStorage).filter((k) => k.startsWith("ph_")),
  );
  expect(traces).toEqual([]);

  // Ni ce qui attendait dans la file, ni la page suivante : plus rien ne part.
  await page.waitForTimeout(4_000); // au-delà du délai d'envoi groupé du SDK (3 s)
  await page.reload();
  await page.waitForLoadState("networkidle");
  expect(urls.slice(auRetrait)).toEqual([]);
});

test("Échap ferme le gestionnaire sans choix : vaut refus, le bandeau ne revient pas", async ({
  page,
}) => {
  const urls = await espionnerPostHog(page);
  await page.goto("/fr");
  await page.getByRole("button", { name: fr.consent.banner.customize }).click();
  await expect(manager(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(manager(page)).toBeHidden();
  await expect(banner(page)).toBeHidden();

  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(banner(page)).toBeHidden();
  expect(urls).toEqual([]);
});
