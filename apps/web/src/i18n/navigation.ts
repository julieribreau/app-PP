import { defaultLocale, locales } from "@nutrion/i18n";
import { createNavigation } from "next-intl/navigation";

// Liens et navigation qui gardent la langue de l'URL (/fr/…, /en/…). Les chemins sont les mêmes
// dans les deux langues (slugs français), seul le préfixe change.
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation({
  locales: [...locales],
  defaultLocale,
});
