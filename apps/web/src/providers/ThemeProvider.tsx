"use client";

import * as React from "react";

import type { Theme } from "@/lib/api/types";
import { applyTheme } from "@/lib/theme";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

/** Thème courant ; `onChange` permet d'enregistrer le choix dans le profil quand on est connecté. */
export function ThemeProvider({
  initial,
  children,
}: {
  readonly initial: Theme;
  readonly children: React.ReactNode;
}) {
  const [theme, setThemeState] = React.useState<Theme>(initial);
  const setTheme = React.useCallback((next: Theme) => {
    applyTheme(next);
    setThemeState(next);
  }, []);
  const value = React.useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme hors de ThemeProvider");
  return ctx;
}
