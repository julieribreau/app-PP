import { tokens, type ColorTokens } from "@nutrion/ui-tokens";
import * as React from "react";
import { useColorScheme } from "react-native";

export type ConsentColors = { readonly [K in keyof ColorTokens]: string };

/** Couleurs du thème du système, surchargées par celles du tenant quand l'app les passe. */
export function usePalette(override?: Partial<ConsentColors>): ConsentColors {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  return React.useMemo(() => ({ ...tokens.color[scheme], ...override }), [scheme, override]);
}
