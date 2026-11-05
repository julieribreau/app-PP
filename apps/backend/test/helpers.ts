import { createHmac } from "node:crypto";

import { user } from "@nutrion/db-schema";
import { eq } from "drizzle-orm";

import { Client, type startApp } from "./app";

type Ctx = Awaited<ReturnType<typeof startApp>>;

export const PASSWORD = "motdepasse-2026";

/** Le lien du dernier e-mail, ramené du site (proxy /api) vers l'API de test. */
export function mailLink(ctx: Ctx, email: string) {
  const link = ctx.mail.lastLinkTo(email);
  if (!link) throw new Error(`aucun e-mail pour ${email}`);
  return link.replace("http://localhost:3000/api", ctx.base);
}

/** Inscription, puis clic sur le lien de vérification : le client repart connecté. */
export async function signUpVerified(ctx: Ctx, email: string, extra: Record<string, string> = {}) {
  const client = new Client(ctx.base);
  const res = await client.req("POST", "/v1/auth/sign-up/email", {
    email,
    password: PASSWORD,
    firstName: "Test",
    lastName: "E2E",
    ...extra,
  });
  if (res.status !== 200) throw new Error(`inscription ${res.status} ${JSON.stringify(res.json)}`);
  const verify = await client.req("GET", mailLink(ctx, email).replace(ctx.base, ""));
  if (verify.status >= 400) throw new Error(`vérification ${verify.status}`);
  return client;
}

export async function makeAdmin(ctx: Ctx, email: string) {
  await ctx.db.update(user).set({ role: "admin" }).where(eq(user.email, email));
}

/** Code TOTP (RFC 6238, SHA-1, 6 chiffres, 30 s) d'un secret base32. */
export function totp(secretBase32: string, now = Date.now()) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of secretBase32.replace(/=+$/, "").toUpperCase())
    bits += alphabet.indexOf(c).toString(2).padStart(5, "0");
  const key = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 30_000)));
  const h = createHmac("sha1", key).update(counter).digest();
  const o = h[h.length - 1]! & 0xf;
  const code = ((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000).toString().padStart(6, "0");
  return code;
}
