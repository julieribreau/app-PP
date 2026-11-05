import type { Decorator, Preview } from "@storybook/react-native-web-vite";
import { defaultLocale, loadMessages, locales } from "@nutrion/i18n";
import { tokens } from "@nutrion/ui-tokens";
import { StyleSheet, View } from "react-native";

import dmMono400 from "@expo-google-fonts/dm-mono/400Regular/DMMono_400Regular.ttf?url";
import dmMono500 from "@expo-google-fonts/dm-mono/500Medium/DMMono_500Medium.ttf?url";
import dmSans400 from "@expo-google-fonts/dm-sans/400Regular/DMSans_400Regular.ttf?url";
import dmSans500 from "@expo-google-fonts/dm-sans/500Medium/DMSans_500Medium.ttf?url";
import dmSans600 from "@expo-google-fonts/dm-sans/600SemiBold/DMSans_600SemiBold.ttf?url";
import fraunces600 from "@expo-google-fonts/fraunces/600SemiBold/Fraunces_600SemiBold.ttf?url";

import { usePrefsStore } from "@/stores/prefs.store";

import { ColorSchemeContext, MessagesContext, type Messages } from "./context";

// Polices de la piste B (ADR-002), sous les noms que l'app enregistre par expo-font : mêmes
// fichiers, servis par le Storybook lui-même (aucune requête vers un service tiers).
const FONTS: Record<string, string> = {
  Fraunces_600SemiBold: fraunces600,
  DMSans_400Regular: dmSans400,
  DMSans_500Medium: dmSans500,
  DMSans_600SemiBold: dmSans600,
  DMMono_400Regular: dmMono400,
  DMMono_500Medium: dmMono500,
};
const fontStyle = document.createElement("style");
fontStyle.textContent = Object.entries(FONTS)
  .map(
    ([family, url]) =>
      `@font-face{font-family:"${family}";src:url("${url}") format("truetype");font-display:block}`,
  )
  .join("");
document.head.appendChild(fontStyle);

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
        <View
          style={[
            styles.screen,
            context.parameters["fullScreen"] ? styles.fullScreen : null,
            { backgroundColor: tokens.color[scheme].bg },
          ]}
        >
          <Story />
        </View>
      </MessagesContext.Provider>
    </ColorSchemeContext.Provider>
  );
};

const styles = StyleSheet.create({
  // Toute la hauteur de la page (preview-head.html), comme l'écran du téléphone.
  screen: { flexGrow: 1, padding: tokens.space[4] },
  // Écran complet de l'app (stories Mobile/Screens) : sans marge, à la taille du téléphone.
  fullScreen: { padding: 0, height: "100vh" },
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
