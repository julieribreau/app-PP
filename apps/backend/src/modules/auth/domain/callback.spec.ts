import { describe, expect, it } from "vitest";

import { withDefaultCallback } from "./callback";

const link = (cb?: string) =>
  `http://localhost:3001/v1/auth/verify-email?token=abc${cb === undefined ? "" : `&callbackURL=${encodeURIComponent(cb)}`}`;

describe("destination des liens d'e-mail", () => {
  it("garde la destination donnée par le client", () => {
    const url = link("http://localhost:3000/en/verifier-email?ok=1");
    expect(withDefaultCallback(url, "http://localhost:3000", "fr", "verifyEmail")).toBe(url);
  });

  it("remplace « / » par la page de confirmation, dans la langue de l'usager", () => {
    const out = new URL(
      withDefaultCallback(link("/"), "http://localhost:3000/", "en", "verifyEmail"),
    );
    expect(out.searchParams.get("callbackURL")).toBe(
      "http://localhost:3000/en/verifier-email?ok=1",
    );
    expect(out.searchParams.get("token")).toBe("abc");
  });

  it("sans destination, un changement d'e-mail ramène au compte", () => {
    const out = new URL(withDefaultCallback(link(), "http://localhost:3000", "fr", "changeEmail"));
    expect(out.searchParams.get("callbackURL")).toBe("http://localhost:3000/fr/compte");
  });
});
