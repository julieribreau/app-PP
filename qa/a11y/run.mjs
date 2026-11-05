// pa11y (htmlcs + axe, WCAG2AA) sur toutes les pages, fr/en, clair/sombre, avec de vrais cookies
// (thème, session) posés dans le navigateur : un en-tête Cookie seul ne survit pas à l'hydratation.
import { readFileSync, writeFileSync } from "node:fs";
import pa11y from "pa11y";
import puppeteer from "puppeteer";

const conf = JSON.parse(readFileSync(new URL("./pages.json", import.meta.url), "utf8"));
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH,
  args: ["--no-sandbox"],
});
const results = [];
for (const { url, headers } of conf.urls) {
  const page = await browser.newPage();
  const cookies = headers.Cookie.split("; ").map((c) => {
    const i = c.indexOf("=");
    return {
      name: c.slice(0, i),
      value: c.slice(i + 1),
      url: process.env.SITE_URL ?? "http://localhost:3000",
    };
  });
  await browser.setCookie(...cookies).catch(async () => page.setCookie(...cookies));
  const theme = cookies.find((c) => c.name === "nutrion_theme").value;
  const r = await pa11y(url, {
    browser,
    page,
    standard: "WCAG2AA",
    runners: ["htmlcs", "axe"],
    wait: 1000,
    timeout: 60000,
  });
  // axe « à vérifier » (needsFurtherReview) sur un contraste : il n'a pas pu lire le fond (élément
  // fixe au-dessus du contenu). On mesure alors nous-mêmes : couleur du texte contre le premier
  // fond opaque de ses ancêtres ; résolu si ≥ 4,5:1, laissé en erreur sinon.
  for (const issue of r.issues) {
    if (issue.code !== "color-contrast" || !issue.runnerExtras?.needsFurtherReview) continue;
    const ratio = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return 0;
      const rgb = (c) => c.match(/[\d.]+/g).map(Number);
      const lum = ([r, g, b]) => {
        const f = (v) => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      let n = el,
        bg = null;
      while (n && !bg) {
        const c = getComputedStyle(n).backgroundColor;
        const v = rgb(c);
        if (v.length === 3 || v[3] === 1) bg = v.slice(0, 3);
        n = n.parentElement;
      }
      const fg = rgb(getComputedStyle(el).color).slice(0, 3);
      const [a, b] = [lum(fg), lum(bg ?? [255, 255, 255])].sort((x, y) => y - x);
      return (a + 0.05) / (b + 0.05);
    }, issue.selector);
    issue.measuredRatio = Math.round(ratio * 100) / 100;
    if (ratio >= 4.5) issue.type = "resolved";
  }
  const ok = await page.evaluate(() => document.documentElement.dataset.theme ?? "system");
  results.push({
    url,
    theme,
    applied: ok,
    issues: r.issues.filter((i) => i.type === "error"),
    resolved: r.issues
      .filter((i) => i.type === "resolved")
      .map((i) => `${i.selector} ${i.measuredRatio}:1`),
  });
  await page.close();
  await browser.deleteCookie?.(...cookies).catch(() => {});
  process.stdout.write(results.at(-1).issues.length ? "x" : ".");
}
await browser.close();
writeFileSync(new URL("./resultats.json", import.meta.url), JSON.stringify(results, null, 1));
const bad = results.filter((r) => r.issues.length);
console.log(
  `\n${results.length} pages, ${bad.length} avec erreurs, thème appliqué partout : ${results.every((r) => r.applied === r.theme)}`,
);
const resolved = results.flatMap((r) => r.resolved.map((x) => `${r.theme} ${r.url} ${x}`));
console.log(
  `${resolved.length} contrastes « à vérifier » mesurés et conformes, ex. : ${resolved.slice(0, 3).join(" ; ")}`,
);
for (const b of bad)
  for (const i of b.issues)
    console.log(
      b.theme,
      b.url,
      i.runner,
      i.code.slice(0, 60),
      i.selector.slice(0, 80),
      i.message.slice(0, 120),
    );
