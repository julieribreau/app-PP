import type { Theme } from "./api/types";

// Thème clair, sombre ou celui du système. Mémorisé dans un cookie que le layout serveur lit
// pour poser data-theme sur <html> avant le premier rendu : aucun flash au chargement.
// « Système » = pas d'attribut, tokens.css suit prefers-color-scheme.
export const THEME_COOKIE = "nutrion_theme";
export const THEMES: readonly Theme[] = ["light", "dark", "system"];

export function parseTheme(value: string | undefined | null): Theme {
  return value === "light" || value === "dark" ? value : "system";
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === "system") delete root.dataset["theme"];
  else root.dataset["theme"] = theme;
  document.cookie = `${THEME_COOKIE}=${theme}; Path=/; Max-Age=31536000; SameSite=Lax`;
}
