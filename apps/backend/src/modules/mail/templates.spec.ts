import { describe, expect, it } from "vitest";

import { mailLocale, renderMail } from "./templates";

describe("renderMail", () => {
  it("rend le lien dans le HTML et le texte, dans la langue de l'usager", () => {
    const m = renderMail("verifyEmail", "en", "a@b.c", "http://x/verify?t=1&u=2", "Camille");
    expect(m.subject).toBe("Confirm your email address");
    expect(m.text).toContain("http://x/verify?t=1&u=2");
    expect(m.html).toContain('href="http://x/verify?t=1&amp;u=2"');
    expect(m.text.startsWith("Hello Camille,")).toBe(true);
  });

  it("échappe le nom de l'usager", () => {
    expect(renderMail("resetPassword", "fr", "a@b.c", "http://x", "<b>").html).toContain(
      "&lt;b&gt;",
    );
  });

  it("retombe sur le français", () => {
    expect(mailLocale("de")).toBe("fr");
    expect(mailLocale("en")).toBe("en");
  });
});
