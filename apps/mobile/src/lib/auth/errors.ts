// Erreurs Better Auth → message de l'écran de connexion. Logique pure, testée sous Vitest.

export type AuthErrorKind = "invalidCredentials" | "locked" | "emailNotVerified" | "generic";

const AUTH_ERROR_RULES: ReadonlyArray<{ kind: AuthErrorKind; codes: RegExp; status: number }> = [
  { kind: "emailNotVerified", codes: /^EMAIL_NOT_VERIFIED$/, status: 403 },
  { kind: "locked", codes: /LOCK|TOO_MANY_REQUESTS/, status: 429 },
  { kind: "invalidCredentials", codes: /^INVALID_EMAIL_OR_PASSWORD$/, status: 401 },
];

export function authErrorKind(error: { code?: string; status?: number } | null | undefined): AuthErrorKind {
  const code = error?.code ?? "";
  const rule = AUTH_ERROR_RULES.find((r) => r.codes.test(code) || r.status === error?.status);
  return rule?.kind ?? "generic";
}

