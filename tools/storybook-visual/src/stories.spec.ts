import { existsSync, readFileSync } from "node:fs";
import { join, normalize, sep } from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { locales } from "@nutrion/i18n";

// Une capture par story, par thème et par langue (décorateurs globaux de .storybook/preview).
// Aucune liste à tenir : les stories viennent de l'index du Storybook construit.
const THEMES = ["light", "dark"] as const;
// Origine fictive : les fichiers de storybook-static/ sont servis par interception, sans
// serveur ni port à ouvrir.
const ORIGIN = "http://storybook.test";

const root = process.env["STORYBOOK_STATIC_DIR"] ?? "";
const axeDisabledRules = (process.env["STORYBOOK_AXE_DISABLED_RULES"] ?? "")
  .split(",")
  .filter(Boolean);
const indexFile = join(root, "index.json");
if (!existsSync(indexFile)) {
  throw new Error(`${indexFile} absent : lancer \`pnpm build-storybook\` avant la régression.`);
}
const index = JSON.parse(readFileSync(indexFile, "utf8")) as {
  entries: Record<string, { id: string; type: string }>;
};
const stories = Object.values(index.entries).filter((entry) => entry.type === "story");

test.beforeEach(async ({ page }) => {
  await page.route(`${ORIGIN}/**`, async (route) => {
    const { pathname } = new URL(route.request().url());
    // Le chemin demandé reste sous storybook-static/ : rien d'autre n'est servi.
    const file = normalize(join(root, decodeURIComponent(pathname)));
    if (!file.startsWith(root + sep) || !existsSync(file)) {
      await route.fulfill({ status: 404 });
      return;
    }
    await route.fulfill({ path: file });
  });
});

for (const story of stories) {
  for (const theme of THEMES) {
    for (const locale of locales) {
      test(`${story.id} ${theme} ${locale}`, async ({ page }) => {
        const erreurs: string[] = [];
        page.on("pageerror", (erreur) => erreurs.push(erreur.message));
        // a11y.manual : l'addon a11y ne lance pas son propre axe, celui d'en bas le remplace.
        const globals = `theme:${theme};locale:${locale};a11y.manual:!true`;
        await page.goto(`${ORIGIN}/iframe.html?id=${story.id}&viewMode=story&globals=${globals}`);
        // Storybook pose l'une de ces classes une fois la story rendue, ou son erreur.
        const body = page.locator("body.sb-show-main, body.sb-show-errordisplay");
        await body.waitFor({ state: "attached" });
        await expect(page.locator("body")).not.toHaveClass(/sb-show-errordisplay/);
        // Polices chargées avant la capture : sinon, faux écarts de texte d'un passage à l'autre.
        await page.evaluate(() => document.fonts.ready);
        await expect(page).toHaveScreenshot([theme, locale, `${story.id}.png`], {
          fullPage: true,
          animations: "disabled",
        });
        expect(erreurs).toEqual([]);
        // L'addon a11y montre les violations dans Storybook ; ici, elles font échouer la CI,
        // dans chaque thème (contrastes du sombre compris) et chaque langue.
        const { violations } = await new AxeBuilder({ page })
          .include("#storybook-root")
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .disableRules(axeDisabledRules)
          .analyze();
        expect(violations.map((v) => `${v.id} : ${v.help}`)).toEqual([]);
      });
    }
  }
}
