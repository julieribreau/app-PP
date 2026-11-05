import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@nutrion/i18n/messages/en.json";
import fr from "@nutrion/i18n/messages/fr.json";
import type * as React from "react";

/** Rendu d'un composant dans le fournisseur de traductions, comme dans l'app. */
export function renderIntl(ui: React.ReactElement, locale: "fr" | "en" = "fr") {
  return render(
    <NextIntlClientProvider locale={locale} messages={locale === "fr" ? fr : en} timeZone="Europe/Paris">
      {ui}
    </NextIntlClientProvider>,
  );
}
