import type { ConsentCopy } from "@nutrion/cmp";
import { defaultLocale, isLocale, type Locale } from "@nutrion/i18n";
import en from "@nutrion/i18n/messages/en.json";
import fr from "@nutrion/i18n/messages/fr.json";
import { getLocales } from "expo-localization";

// Dictionnaires partagés avec le web. Le bloc `consent` a la forme qu'attend le paquet cmp :
// une clé manquante ne compile pas.
const MESSAGES = { fr, en } satisfies Record<Locale, typeof fr & { consent: ConsentCopy }>;

export type Messages = (typeof MESSAGES)[Locale];

/** Langue de l'appareil si le projet la parle, sinon la langue par défaut du projet. */
export function deviceLocale(): Locale {
  const language = getLocales()[0]?.languageCode ?? "";
  if (isLocale(language)) return language;
  return isLocale(defaultLocale) ? defaultLocale : "fr";
}

export function messages(locale: Locale = deviceLocale()): Messages {
  return MESSAGES[locale];
}
