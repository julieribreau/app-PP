import { createHmac } from "node:crypto";
import {
  existsSync as fileExists,
  mkdirSync as makeDir,
  readFileSync as readFile,
  writeFileSync as writeFile,
} from "node:fs";
import { dirname as dirOf, join as joinPath } from "node:path";

import { expect, type Page } from "@playwright/test";

export const MAILPIT_URL = process.env["MAILPIT_URL"] ?? "http://localhost:8025";
export const API_URL = process.env["E2E_API_URL"] ?? "http://localhost:3001";

export const ADMIN = { email: "admin@nutrion.local", password: "Nutrion-Admin-2026" };
export const CAMILLE = { email: "camille.martin@exemple.fr", password: "Nutrion-Demo-2026" };

/** Consentement déjà donné (refus de la mesure) : le bandeau ne masque pas l'interface. */
export async function consentDecided(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const now = new Date().toISOString();
    localStorage.setItem(
      "consent",
      JSON.stringify({
        version: "1",
        purposes: ["analytics"],
        choices: { analytics: false },
        decidedAt: now,
        choiceDates: { analytics: now },
      }),
    );
  });
}

/** Adresse unique par passage : les tests réels n'écrasent pas les comptes du seed. */
export function uniqueEmail(prefix: string): string {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@exemple.fr`;
}

type MailpitMessage = { ID: string; Subject: string; To: { Address: string }[] };

/** Dernier e-mail reçu par `to` (Mailpit), attendu jusqu'à 15 s. */
export async function waitForMail(
  to: string,
  subject?: RegExp,
): Promise<{ text: string; html: string; subject: string }> {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const res = await fetch(
      `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`,
    );
    const { messages } = (await res.json()) as { messages: MailpitMessage[] };
    const found = messages.find((m) => !subject || subject.test(m.Subject));
    if (found) {
      const msg = (await (await fetch(`${MAILPIT_URL}/api/v1/message/${found.ID}`)).json()) as {
        Text: string;
        HTML: string;
        Subject: string;
      };
      return { text: msg.Text, html: msg.HTML, subject: msg.Subject };
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Aucun e-mail pour ${to}`);
}

/** Premier lien http(s) du texte de l'e-mail qui contient `fragment`. */
export function linkIn(mail: { text: string; html: string }, fragment: string): string {
  const links = [...`${mail.text} ${mail.html}`.matchAll(/https?:\/\/[^\s"'<>]+/g)].map((m) =>
    m[0].replace(/&amp;/g, "&"),
  );
  const link = links.find((l) => l.includes(fragment));
  if (!link) throw new Error(`Pas de lien « ${fragment} » dans : ${links.join(", ")}`);
  return link;
}

/** Code TOTP (RFC 6238, SHA-1, 6 chiffres, 30 s) d'un secret en base32. */
export function totp(secretBase32: string, at = Date.now()): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = secretBase32.replace(/=+$/, "").replace(/\s/g, "").toUpperCase();
  let bits = "";
  for (const c of clean) bits += alphabet.indexOf(c).toString(2).padStart(5, "0");
  const key = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 1000 / 30)));
  const hmac = createHmac("sha1", key).update(counter).digest();
  const offset = hmac[hmac.length - 1]! & 0xf;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return code.toString().padStart(6, "0");
}

/** Connexion par le formulaire du site. */
export async function signIn(
  page: Page,
  who: { email: string; password: string },
  labels: { email: string; password: string; submit: string },
): Promise<void> {
  await page.goto("/fr/connexion");
  await page.getByLabel(labels.email).fill(who.email);
  await page.getByLabel(labels.password, { exact: true }).fill(who.password);
  await page.getByRole("button", { name: labels.submit, exact: true }).click();
}

/** Aucune erreur console « réelle » pendant le test (hors bruit réseau attendu). */
export function trackConsoleErrors(page: Page): () => void {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return () => expect(errors, "erreurs JS de la page").toEqual([]);
}

/** Compte neuf et vérifié, créé par l'API (inscription + lien de l'e-mail) : rapide et isolé. */
export async function createVerifiedUser(
  prefix: string,
  firstName = "Test",
  lastName = "Réel",
): Promise<{ email: string; password: string }> {
  const email = uniqueEmail(prefix);
  const password = "Reel-Nutrion-2026";
  const res = await fetch(`${API_URL}/v1/auth/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost:3000" },
    body: JSON.stringify({
      email,
      password,
      name: `${firstName} ${lastName}`,
      firstName,
      lastName,
    }),
  });
  if (!res.ok) throw new Error(`inscription ${res.status} ${await res.text()}`);
  const link = linkIn(await waitForMail(email), "verify-email");
  const verify = await fetch(link, { redirect: "manual" });
  if (verify.status >= 400) throw new Error(`vérification ${verify.status}`);
  return { email, password };
}

// --- Finition : session admin par l'API, textes FR restants sur les pages EN ---------------

export const SITE_ORIGIN = process.env["E2E_BASE_URL"] ?? "http://localhost:3000";
const ADMIN_STATE = joinPath(__dirname, ".state", "admin-totp.json");

/**
 * Ouvre une session admin dans le contexte de `page` (cookies partagés) : mot de passe, puis
 * défi TOTP si la 2FA est active, sinon activation de la 2FA et secret gardé dans .state/.
 */
export async function adminSession(page: Page): Promise<string> {
  const headers = { origin: SITE_ORIGIN };
  const signInRes = await page.request.post("/api/v1/auth/sign-in/email", { data: ADMIN, headers });
  expect(signInRes.ok(), await signInRes.text()).toBe(true);
  let secret = fileExists(ADMIN_STATE)
    ? (JSON.parse(readFile(ADMIN_STATE, "utf8")) as { secret: string }).secret
    : "";
  if ((await signInRes.json()).twoFactorRedirect) {
    if (!secret) throw new Error("2FA admin active sans secret connu : relancer `make seed`");
  } else {
    const enable = await page.request.post("/api/v1/auth/two-factor/enable", {
      data: { password: ADMIN.password },
      headers,
    });
    expect(enable.ok(), await enable.text()).toBe(true);
    secret = new URL((await enable.json()).totpURI).searchParams.get("secret")!;
    makeDir(dirOf(ADMIN_STATE), { recursive: true });
    writeFile(ADMIN_STATE, JSON.stringify({ secret }));
  }
  const verify = await page.request.post("/api/v1/auth/two-factor/verify-totp", {
    data: { code: totp(secret) },
    headers,
  });
  expect(verify.ok(), await verify.text()).toBe(true);
  return secret;
}

type Messages = Record<string, unknown>;

function leaves(d: Messages, prefix = ""): [string, string][] {
  return Object.entries(d).flatMap(([k, v]) =>
    typeof v === "string"
      ? [[prefix + k, v] as [string, string]]
      : leaves(v as Messages, `${prefix}${k}.`),
  );
}

/** Textes d'interface propres au français (absents de l'anglais), assez longs pour être sûrs. */
export function frenchOnlyStrings(fr: Messages, en: Messages): string[] {
  const english = new Map(leaves(en));
  return leaves(fr)
    .filter(([key, value]) => english.get(key) !== value)
    .map(([, value]) => value.split(/\{[^}]*\}/)[0]!.trim())
    .filter((v) => v.length >= 10 && !/[{}<>]/.test(v));
}

/** Une clé de traduction affichée brute (« admin.users », « cart.title »). */
export const RAW_KEY =
  /\b(common|nav|theme|locale|footer|landing|shop|product|cart|auth|account|admin|consent|env|home|legal)\.[a-z][a-zA-Z]+(\.[a-zA-Z]+)*\b/;
