import { describe, expect, it } from "vitest";

import { csvCell, toCsv, userStatus } from "./user-status";

describe("statut d'un usager", () => {
  it("suspendu prime sur non vérifié", () => {
    expect(userStatus({ suspendedAt: new Date(), emailVerified: false })).toBe("suspended");
    expect(userStatus({ suspendedAt: null, emailVerified: false })).toBe("unverified");
    expect(userStatus({ suspendedAt: null, emailVerified: true })).toBe("active");
  });
});

describe("CSV", () => {
  it("échappe et neutralise les formules", () => {
    expect(csvCell('a;"b"')).toBe('"a;""b"""');
    expect(csvCell("=SOMME(A1)")).toBe("'=SOMME(A1)");
    expect(csvCell(null)).toBe("");
  });
  it("commence par un BOM et sépare par des points-virgules", () => {
    expect(toCsv(["a", "b"], [[1, 2]])).toBe("\uFEFFa;b\r\n1;2\r\n");
  });
});
