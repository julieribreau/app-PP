import { inferAdditionalFields, twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// Client Better Auth, monté sous /v1/auth côté backend et joint par le proxy même origine
// (/api/v1/auth) : la session reste un cookie httpOnly du domaine du site.
const origin =
  typeof window === "undefined"
    ? (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000")
    : window.location.origin;

export const authClient = createAuthClient({
  baseURL: `${origin}/api/v1/auth`,
  plugins: [
    twoFactorClient(),
    inferAdditionalFields({
      user: {
        role: { type: "string", required: false, input: false },
        firstName: { type: "string", required: false },
        lastName: { type: "string", required: false },
        locale: { type: "string", required: false },
        theme: { type: "string", required: false },
      },
    }),
  ],
});

export type Session = typeof authClient.$Infer.Session;
export type SessionUser = Session["user"];

/** Mot de passe du socle : 12 caractères minimum, dont au moins un chiffre. */
export function isStrongPassword(value: string): boolean {
  return value.length >= 12 && /\d/.test(value);
}
