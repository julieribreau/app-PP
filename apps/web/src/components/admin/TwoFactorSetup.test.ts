import { describe, expect, it } from "vitest";

import { totpSecret } from "./TwoFactorSetup";

describe("clé 2FA à saisir manuellement", () => {
  it("extrait le secret de l'URI otpauth", () => {
    expect(
      totpSecret(
        "otpauth://totp/NutrionApp:admin%40nutrion.local?secret=JBSWY3DPEHPK3PXP&issuer=NutrionApp",
      ),
    ).toBe("JBSWY3DPEHPK3PXP");
  });

  it("rend une chaîne vide sur une URI illisible", () => {
    expect(totpSecret("pas une uri")).toBe("");
  });
});
