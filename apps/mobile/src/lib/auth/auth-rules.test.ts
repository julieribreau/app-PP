import { describe, expect, it } from "vitest";

import { authErrorKind } from "./errors";
import { isEmail, isStrongPassword } from "./validation";

describe("règles des formulaires d'accès", () => {
  it("valide l'e-mail", () => {
    expect(isEmail(" camille.martin@exemple.fr ")).toBe(true);
    expect(isEmail("camille@")).toBe(false);
  });

  it("exige 12 caractères dont un chiffre", () => {
    expect(isStrongPassword("Nutrion-Demo-2026")).toBe(true);
    expect(isStrongPassword("courtmais1")).toBe(false);
    expect(isStrongPassword("assezlongsanschiffre")).toBe(false);
  });
});

describe("erreurs de connexion", () => {
  it("traduit les codes Better Auth et les statuts", () => {
    expect(authErrorKind({ code: "INVALID_EMAIL_OR_PASSWORD", status: 401 })).toBe("invalidCredentials");
    expect(authErrorKind({ code: "EMAIL_NOT_VERIFIED", status: 403 })).toBe("emailNotVerified");
    expect(authErrorKind({ status: 429 })).toBe("locked");
    expect(authErrorKind({ code: "ACCOUNT_LOCKED" })).toBe("locked");
    expect(authErrorKind({ status: 500 })).toBe("generic");
    expect(authErrorKind(null)).toBe("generic");
  });
});
