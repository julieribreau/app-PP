import { describe, expect, it } from "vitest";

import { adminAccess } from "./adminAccess";

describe("adminAccess", () => {
  it("attend la session", () => expect(adminAccess(true, null)).toBe("loading"));
  it("renvoie l'invité vers la connexion", () =>
    expect(adminAccess(false, null)).toBe("anonymous"));
  it("refuse un usager", () =>
    expect(adminAccess(false, { role: "user", twoFactorEnabled: true })).toBe("forbidden"));
  it("impose la 2FA à un admin qui ne l'a pas", () =>
    expect(adminAccess(false, { role: "admin", twoFactorEnabled: false })).toBe("needs-2fa"));
  it("ouvre le back-office à un admin avec 2FA", () =>
    expect(adminAccess(false, { role: "admin", twoFactorEnabled: true })).toBe("granted"));
});
