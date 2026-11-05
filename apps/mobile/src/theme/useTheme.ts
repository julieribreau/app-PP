import { tokens, type ColorTokens, type ThemeName } from "@nutrion/ui-tokens";
import * as React from "react";
import { Appearance, useColorScheme } from "react-native";

import { usePrefsStore } from "@/stores/prefs.store";
import type { ThemePreference } from "@/types/api";

// Thème : la préférence (clair, sombre, système) est appliquée à l'app entière par
// Appearance.setColorScheme ; chaque composant lit le résultat par useColorScheme(). Le
// Storybook mobile remplace ce hook par le thème de sa barre d'outils (.storybook/react-native.js).

export interface Theme {
  name: ThemeName;
  color: ColorTokens;
  radius: typeof tokens.radius;
  space: typeof tokens.space;
  font: typeof tokens.font;
}

export function useTheme(): Theme {
  const name: ThemeName = useColorScheme() === "dark" ? "dark" : "light";
  return React.useMemo(
    () => ({ name, color: tokens.color[name], radius: tokens.radius, space: tokens.space, font: tokens.font }),
    [name],
  );
}

export function applyThemePreference(preference: ThemePreference): void {
  Appearance.setColorScheme(preference === "system" ? "unspecified" : preference);
}

/** Applique la préférence au montage et à chaque changement. */
export function useApplyThemePreference(): void {
  const preference = usePrefsStore((s) => s.theme);
  React.useEffect(() => applyThemePreference(preference), [preference]);
}
