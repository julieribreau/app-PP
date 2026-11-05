import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it } from "vitest";
import en from "@nutrion/i18n/messages/en.json";
import fr from "@nutrion/i18n/messages/fr.json";

import { PreprodBanner } from "./PreprodBanner";

function afficher(appEnv: string | undefined, locale: "fr" | "en" = "fr") {
  render(
    <NextIntlClientProvider locale={locale} messages={locale === "fr" ? fr : en}>
      <PreprodBanner appEnv={appEnv} />
    </NextIntlClientProvider>,
  );
}

describe("PreprodBanner", () => {
  afterEach(cleanup);

  it("s'affiche en préprod, dans la langue de la page", () => {
    afficher("preprod");
    expect(screen.getByRole("note").textContent).toBe(fr.env.preprod);
  });

  it("parle anglais sur une page anglaise", () => {
    afficher("preprod", "en");
    expect(screen.getByRole("note").textContent).toBe(en.env.preprod);
  });

  it.each(["production", "development", undefined])("ne s'affiche pas en %s", (appEnv) => {
    afficher(appEnv);
    expect(screen.queryByRole("note")).toBeNull();
  });
});
