import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, devices } from "@playwright/test";

export interface VisualOptions {
  /** Dossier de l'app Storybook : `storybook-static/` y est lu, `visual/references/` écrit. */
  readonly appDir: string;
  readonly viewport: { readonly width: number; readonly height: number };
}

/**
 * Régression visuelle d'un Storybook construit (`pnpm build-storybook`), sans service tiers :
 * Playwright ouvre chaque story, la capture et la compare à `visual/references/`, commité.
 *
 * Le rendu des polices et l'anticrénelage changent d'un système à l'autre : les références
 * se produisent et se comparent dans la MÊME image, celle du job `visual` de ci.yml
 * (`make visual` la lance en local). Hors Linux, la suite refuse de tourner.
 */
export function visualConfig({ appDir, viewport }: VisualOptions) {
  if (process.platform !== "linux") {
    throw new Error(
      "Régression visuelle : lancer `make visual` (image Playwright de la CI), pas le navigateur du poste.",
    );
  }
  process.env["STORYBOOK_STATIC_DIR"] = join(appDir, "storybook-static");
  const ci = Boolean(process.env["CI"]);
  return defineConfig({
    testDir: fileURLToPath(new URL(".", import.meta.url)),
    testMatch: "stories.spec.ts",
    outputDir: join(appDir, "test-results"),
    // visual/references/<thème>/<langue>/<id de la story>.png
    snapshotPathTemplate: join(appDir, "visual/references/{arg}{ext}"),
    fullyParallel: true,
    forbidOnly: ci,
    // En CI, une référence absente échoue ; en local, le premier passage l'écrit, à relire
    // avant de la commiter. `pnpm visual:update` remplace celles qui ont changé.
    updateSnapshots: ci ? "none" : "missing",
    reporter: ci
      ? [["github"], ["html", { open: "never", outputFolder: join(appDir, "playwright-report") }]]
      : "list",
    use: {
      ...devices["Desktop Chrome"],
      viewport,
      deviceScaleFactor: 1,
      // Dates du gestionnaire de consentement : même fuseau partout.
      timezoneId: "Europe/Paris",
      locale: "fr-FR",
    },
    projects: [{ name: "chromium" }],
  });
}
