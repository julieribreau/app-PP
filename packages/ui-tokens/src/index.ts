// Design tokens en valeurs réelles : React Native ne lit ni le CSS ni les var(--…).
// Le web lit tokens.css, qui porte les MÊMES valeurs : modifier les deux ensemble.
// Un tenant surcharge ces valeurs (couleurs, police) au runtime, pour les deux thèmes.
const palette = {
  light: {
    bg: "#ffffff",
    fg: "#0a0a0a",
    primary: "#2563eb",
    onPrimary: "#ffffff",
    muted: "#6b7280",
  },
  dark: {
    bg: "#0a0a0a",
    fg: "#fafafa",
    primary: "#60a5fa",
    onPrimary: "#0a0a0a",
    muted: "#9ca3af",
  },
} as const;

export type ThemeName = keyof typeof palette;
export type ColorTokens = (typeof palette)[ThemeName];

export const tokens = {
  color: palette,
  radius: 8,
  space: { 1: 4, 2: 8, 4: 16 },
} as const;
