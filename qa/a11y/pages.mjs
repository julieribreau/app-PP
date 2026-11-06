// Génère la configuration pa11y-ci : toutes les pages, fr et en, clair et sombre, connecté si besoin.
import { createHmac } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
const SITE = process.env.SITE_URL ?? "http://localhost:3000";
const H = { "content-type": "application/json", origin: SITE };
function totp(secret) {
  const a = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of secret.toUpperCase()) bits += a.indexOf(c).toString(2).padStart(5, "0");
  const key = Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)));
  const ctr = Buffer.alloc(8);
  ctr.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const h = createHmac("sha1", key).update(ctr).digest();
  const o = h[h.length - 1] & 15;
  return ((h.readUInt32BE(o) & 0x7fffffff) % 1e6).toString().padStart(6, "0");
}
const cookiesOf = (res) =>
  res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
async function session(email, password, secret) {
  let r = await fetch(`${SITE}/api/v1/auth/sign-in/email`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({ email, password }),
  });
  let cookie = cookiesOf(r);
  if (secret) {
    r = await fetch(`${SITE}/api/v1/auth/two-factor/verify-totp`, {
      method: "POST",
      headers: { ...H, cookie },
      body: JSON.stringify({ code: totp(secret) }),
    });
    cookie = cookiesOf(r);
  }
  return cookie;
}
const secret = JSON.parse(
  readFileSync(new URL("../../apps/web/e2e-real/.state/admin-totp.json", import.meta.url), "utf8"),
).secret;
const camille = await session("camille.martin@exemple.fr", "Nutrion-Demo-2026");
const admin = await session("admin@nutrion.local", "Nutrion-Admin-2026", secret);
const prod = await (
  await fetch(`${SITE}/api/v1/admin/products?pageSize=1`, { headers: { cookie: admin } })
).json();
const pub = [
  "",
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
const adm = [
  "/admin",
  "/admin/usagers",
  "/admin/produits",
  `/admin/produits/${prod.items[0].id}`,
  "/admin/produits/nouveau",
  "/admin/categories",
  "/admin/journal",
];
const urls = [];
for (const locale of ["fr", "en"])
  for (const theme of ["light", "dark"]) {
    const base = `nutrion_theme=${theme}`;
    for (const p of pub) urls.push({ url: `${SITE}/${locale}${p}`, headers: { Cookie: base } });
    urls.push({ url: `${SITE}/${locale}/compte`, headers: { Cookie: `${base}; ${camille}` } });
    for (const p of adm)
      urls.push({ url: `${SITE}/${locale}${p}`, headers: { Cookie: `${base}; ${admin}` } });
  }
writeFileSync(
  new URL("./pages.json", import.meta.url),
  JSON.stringify(
    {
      defaults: {
        standard: "WCAG2AA",
        runners: ["htmlcs", "axe"],
        timeout: 60000,
        wait: 1500,
        threshold: 0,
        concurrency: 2,
        chromeLaunchConfig: { args: ["--no-sandbox", "--disable-setuid-sandbox"] },
      },
      urls,
    },
    null,
    1,
  ),
);
console.log(urls.length, "pages");
