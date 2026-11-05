// Verrouillage du compte (socle, comptes back-office et usagers) : 5 échecs de mot de passe
// d'affilée verrouillent la connexion 15 minutes ; un succès remet le compteur à zéro.
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_DURATION_MS = 15 * 60_000;

export function isLocked(lockedUntil: Date | null | undefined, now: Date): boolean {
  return lockedUntil != null && lockedUntil.getTime() > now.getTime();
}

/** État après un échec : le 5e échec verrouille et remet le compteur à zéro. */
export function afterFailedAttempt(attempts: number, now: Date) {
  const next = attempts + 1;
  return next >= MAX_FAILED_ATTEMPTS
    ? { failedLoginAttempts: 0, lockedUntil: new Date(now.getTime() + LOCK_DURATION_MS) }
    : { failedLoginAttempts: next, lockedUntil: null };
}

/** Mot de passe : 12 caractères au moins (Better Auth) dont un chiffre (ici). */
export const hasDigit = (password: unknown) => typeof password === "string" && /\d/.test(password);
