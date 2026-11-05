// Config i18n partagée web/mobile. Langues = fr,en.
// FR et EN toujours, avec le sélecteur de langue (socle) : ajouter ici les autres, leur
// dictionnaire dans ./messages/ et son chargeur ci-dessous (une langue sans chargeur ne
// compile pas). Le job lint de la CI refuse une clé absente d'une langue.
import type fr from "./messages/fr.json";

export const locales = ["fr", "en"] as const;
export const defaultLocale = "fr";
export type Locale = (typeof locales)[number];

type Messages = typeof fr;

// Un chemin écrit en entier par langue, pas un gabarit `./messages/${locale}.json` : Metro
// (mobile) refuse un import dynamique calculé, et le bundler web découpe chaque langue à part.
const loaders: Record<Locale, () => Promise<{ default: Messages }>> = {
  fr: () => import("./messages/fr.json"),
  en: () => import("./messages/en.json"),
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** Le dictionnaire d'une langue ; une langue inconnue retombe sur la langue par défaut. */
export async function loadMessages(locale: string): Promise<Messages> {
  const fallback: Locale = isLocale(defaultLocale) ? defaultLocale : "fr";
  return (await loaders[isLocale(locale) ? locale : fallback]()).default;
}
