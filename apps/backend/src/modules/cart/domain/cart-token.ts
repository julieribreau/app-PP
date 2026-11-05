import { createHash, randomBytes } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";

export const CART_COOKIE = "nutrion_cart";
export const CART_HEADER = "x-cart-token";
export const CART_TOKEN_MAX_AGE_MS = 90 * 24 * 3600 * 1000;

/** Jeton de panier invité : aléatoire, envoyé au client ; seul son hash est stocké. */
export const newCartToken = () => randomBytes(32).toString("base64url");
export const hashCartToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Le jeton de la requête : en-tête (mobile) d'abord, cookie (web) sinon. */
export function readCartToken(headers: IncomingHttpHeaders): string | null {
  const header = headers[CART_HEADER];
  const fromHeader = Array.isArray(header) ? header[0] : header;
  if (fromHeader && /^[\w-]{20,128}$/.test(fromHeader)) return fromHeader;
  const cookie = headers.cookie
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${CART_COOKIE}=`))
    ?.slice(CART_COOKIE.length + 1);
  return cookie && /^[\w-]{20,128}$/.test(cookie) ? decodeURIComponent(cookie) : null;
}
