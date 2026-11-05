import type { Decorator, Preview } from "@storybook/react-vite";
import { defaultLocale, loadMessages, locales } from "@nutrion/i18n";
import { NextIntlClientProvider } from "next-intl";

// Les feuilles de l'app web, dans le même ordre que son layout : la story montre son rendu.
import "@nutrion/ui-tokens/tokens.css";
import "@nutrion/cmp/web/consent.css";
import "@nutrion/ui/ui.css";
import "../../web/app/globals.css";

type Messages = Awaited<ReturnType<typeof loadMessages>>;

/**
 * Thème et langue, pour toutes les stories (barre d'outils, ou `globals` de l'URL que lit la
 * régression visuelle). Le thème se pose comme le sélecteur de l'app : data-theme sur <html>.
 */
const withThemeAndLocale: Decorator = (Story, context) => {
  const theme = context.globals["theme"] === "dark" ? "dark" : "light";
  const locale = String(context.globals["locale"] ?? defaultLocale);
  document.documentElement.dataset["theme"] = theme;
  document.documentElement.lang = locale;
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={context.loaded["messages"] as Messages}
      timeZone="Europe/Paris"
    >
      <Story />
    </NextIntlClientProvider>
  );
};

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
    layout: "padded",
    // Une violation d'accessibilité fait échouer la story (socle : RGAA AA).
    a11y: { test: "error" },
  },
};

export default preview;
