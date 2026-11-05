import { describe, expect, it } from "vitest";

import { sanitizeDescription, slugify } from "./text";

describe("texte", () => {
  it("ne garde que la liste blanche", () => {
    expect(
      sanitizeDescription(
        '<p onclick="x()">Bon <script>alert(1)</script><b>gras</b> <a href="javascript:x" style="c">l</a></p>',
      ),
    ).toBe("<p>Bon <strong>gras</strong> <a>l</a></p>");
  });
  it("slugifie", () => {
    expect(slugify("Avoine & cacao")).toBe("avoine-cacao");
    expect(slugify("Crème brûlée !")).toBe("creme-brulee");
  });
});
