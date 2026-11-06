import { describe, expect, it } from "vitest";

import config from "../../app.config";

describe("configuration native", () => {
  it("donne à Android un nom de paquet Java valide", () => {
    expect(config.android?.package).toMatch(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/);
  });
});
