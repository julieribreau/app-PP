import type { loadMessages } from "@nutrion/i18n";
import * as React from "react";

export type ColorScheme = "light" | "dark";
export type Messages = Awaited<ReturnType<typeof loadMessages>>;

/** Thème de la barre d'outils, rendu par `useColorScheme` (cf react-native.js). */
export const ColorSchemeContext = React.createContext<ColorScheme>("light");

/** Dictionnaire de la langue de la barre d'outils, chargé par `preview`. */
export const MessagesContext = React.createContext<Messages | null>(null);

export function useStoryMessages(): Messages {
  const messages = React.useContext(MessagesContext);
  if (!messages) throw new Error("useStoryMessages : à rendre sous le décorateur de preview");
  return messages;
}

export function useStoryColorScheme(): ColorScheme {
  return React.useContext(ColorSchemeContext);
}
