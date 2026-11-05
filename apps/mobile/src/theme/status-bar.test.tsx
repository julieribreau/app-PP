import { describe, expect, it } from "@jest/globals";

import { statusBarStyleFor } from "./useTheme";

describe("barre d'état", () => {
  it("texte clair sur le thème sombre, sombre sur le thème clair", () => {
    expect(statusBarStyleFor("dark")).toBe("light");
    expect(statusBarStyleFor("light")).toBe("dark");
  });
});
