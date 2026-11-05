import type { Decorator, Preview } from "@storybook/react-native-web-vite";
import { defaultLocale, loadMessages, locales } from "@nutrion/i18n";
import { tokens } from "@nutrion/ui-tokens";
import { StyleSheet, View } from "react-native";

import { usePrefsStore } from "@/stores/prefs.store";

import { ColorSchemeContext, MessagesContext, type Messages } from "./context";

/**
 * Thème et langue, pour toutes les stories (barre d'outils, ou `globals` de l'URL que lit la
 * régression visuelle). Le fond est celui de l'écran de l'app dans ce thème.
 */
const withThemeAndLocale: Decorator = (Story, context) => {
  const scheme = context.globals["theme"] === "dark" ? "dark" : "light";
  const locale = String(context.globals["locale"] ?? defaultLocale);
  document.documentElement.lang = locale;
  // Les composants de l'app lisent la langue dans leurs préférences (stores/prefs.store).
  if (locale === "fr" || locale === "en") usePrefsStore.setState({ locale });
  // Sous l'écran, la page du navigateur : même fond, sur toute la hauteur de la capture.
  document.documentElement.style.backgroundColor = tokens.color[scheme].bg;
  return (
    <ColorSchemeContext.Provider value={scheme}>
      <MessagesContext.Provider value={context.loaded["messages"] as Messages}>
        <View style={[styles.screen, { backgroundColor: tokens.color[scheme].bg }]}>
          <Story />
        </View>
      </MessagesContext.Provider>
    </ColorSchemeContext.Provider>
  );
};

const styles = StyleSheet.create({
  // Toute la hauteur de la page (preview-head.html), comme l'écran du téléphone.
  screen: { flexGrow: 1, padding: tokens.space[4] },
});

const preview: Preview = {
  // Le dictionnaire de la langue choisie, chargé comme dans l'app (packages/i18n).
  loaders: [async ({ globals }) => ({ messages: await loadMessages(String(globals["locale"])) })],
  decorators: [withThemeAndLocale],
  globalTypes: {
    theme: {
      description: "Thème",
      toolbar: {
        title: "Thème",
        icon: "mirror",
        items: [
          { value: "light", title: "Clair" },
          { value: "dark", title: "Sombre" },
        ],
        dynamicTitle: true,
      },
    },
    locale: {
      description: "Langue",
      toolbar: {
        title: "Langue",
        icon: "globe",
        items: locales.map((locale) => ({ value: locale, title: locale.toUpperCase() })),
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: "light", locale: defaultLocale },
  parameters: {
    layout: "fullscreen",
    // Une violation d'accessibilité fait échouer la story (socle : RGAA AA).
    a11y: { test: "error" },
  },
};

export default preview;
