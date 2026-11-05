import type { ConsentCopy } from "@nutrion/cmp";
import { defaultLocale, isLocale, type Locale } from "@nutrion/i18n";
import en from "@nutrion/i18n/messages/en.json";
import fr from "@nutrion/i18n/messages/fr.json";

// Dictionnaires partagés avec le web. Le bloc `consent` a la forme qu'attend le paquet cmp :
// une clé manquante ne compile pas.
const MESSAGES = { fr, en } satisfies Record<Locale, typeof fr & { consent: ConsentCopy }>;

/** Langue de l'appareil si le projet la parle, sinon la langue par défaut du projet. */
export function deviceLocale(): Locale {
  const language = Intl.DateTimeFormat().resolvedOptions().locale.slice(0, 2);
  if (isLocale(language)) return language;
  return isLocale(defaultLocale) ? defaultLocale : "fr";
}

export function messages(locale: Locale = deviceLocale()): (typeof MESSAGES)[Locale] {
  return MESSAGES[locale];
}
