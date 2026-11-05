import { describe, expect, it } from "vitest";

import { localize, pickLocale } from "./locale";

describe("langue", () => {
  it("lit Accept-Language", () => {
    expect(pickLocale("en-GB,en;q=0.9")).toBe("en");
    expect(pickLocale("de")).toBe("fr");
    expect(pickLocale(undefined)).toBe("fr");
  });

  it("retombe sur le français quand la traduction manque", () => {
    expect(localize({ fr: "Saveur" }, "en")).toBe("Saveur");
    expect(localize({ fr: "Saveur", en: "Flavour" }, "en")).toBe("Flavour");
  });
});
