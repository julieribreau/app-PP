import type { ExpoConfig } from "expo/config";

// Configuration Expo, en TypeScript pour lire l'environnement du build (profil de eas.json,
// poste de build local) : brique build-mobile-ota.
const config: ExpoConfig = {
  name: "NutrionApp",
  slug: "nutrion-app",
  scheme: "nutrion-app",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  plugins: [
    "expo-router",
    [
      // Symboles natifs et sourcemaps envoyés à Sentry au build local (`make mobile-build`),
      // avec SENTRY_AUTH_TOKEN, SENTRY_ORG et SENTRY_PROJECT pris dans l'environnement du
      // poste, jamais dans un fichier suivi par git (skill mobile-dev-expo §8).
      "@sentry/react-native/expo",
      { organization: process.env["SENTRY_ORG"], project: process.env["SENTRY_PROJECT"] },
    ],
  ],
  ios: { supportsTablet: true, bundleIdentifier: "io.bullify.nutrion-app" },
  android: { package: "io.bullify.nutrion-app" },
};

export default config;
