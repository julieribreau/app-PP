import { describe, expect, it } from "vitest";

import { afterFailedAttempt, hasDigit, isLocked, LOCK_DURATION_MS } from "./lockout";

const now = new Date("2026-11-05T10:00:00Z");

describe("verrouillage", () => {
  it("compte les quatre premiers échecs sans verrouiller", () => {
    expect(afterFailedAttempt(3, now)).toEqual({ failedLoginAttempts: 4, lockedUntil: null });
  });

  it("verrouille 15 minutes au 5e échec et remet le compteur à zéro", () => {
    const etat = afterFailedAttempt(4, now);
    expect(etat.failedLoginAttempts).toBe(0);
    expect(etat.lockedUntil?.getTime()).toBe(now.getTime() + LOCK_DURATION_MS);
    expect(isLocked(etat.lockedUntil, now)).toBe(true);
    expect(isLocked(etat.lockedUntil, new Date(now.getTime() + LOCK_DURATION_MS + 1))).toBe(false);
  });

  it("exige un chiffre", () => {
    expect(hasDigit("motdepassesansun")).toBe(false);
    expect(hasDigit("motdepasse2026")).toBe(true);
  });
});
