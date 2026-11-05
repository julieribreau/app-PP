import type { ExpoConfig } from "expo/config";

// Configuration Expo, en TypeScript pour lire l'environnement du build (profil de eas.json,
// poste de build local) : brique build-mobile-ota.
const faceIdText =
  "NutrionApp utilise Face ID pour déverrouiller votre session sans saisir votre mot de passe.";

const config: ExpoConfig = {
  name: "NutrionApp",
  slug: "nutrion-app",
  // Schéma des liens profonds : retour des e-mails (confirmation, mot de passe oublié) et du
  // client Better Auth (@better-auth/expo, `scheme: "nutrion"`).
  scheme: "nutrion",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  // Fond du thème clair (piste B, ADR-002) derrière l'écran de lancement et la vue racine.
  backgroundColor: "#fbf5ec",
  plugins: [
    "expo-router",
    "expo-font",
    "expo-secure-store",
    "expo-sharing",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#fbf5ec",
        dark: { backgroundColor: "#1c1410" },
        imageWidth: 160,
      },
    ],
    ["expo-local-authentication", { faceIDPermission: faceIdText }],
    [
      "expo-image-picker",
      {
        photosPermission:
          "NutrionApp accède à vos photos uniquement pour choisir votre photo de profil.",
        cameraPermission: false,
        microphonePermission: false,
      },
    ],
    [
      // Symboles natifs et sourcemaps envoyés à Sentry au build local (`make mobile-build`),
      // avec SENTRY_AUTH_TOKEN, SENTRY_ORG et SENTRY_PROJECT pris dans l'environnement du
      // poste, jamais dans un fichier suivi par git (skill mobile-dev-expo §8).
      "@sentry/react-native/expo",
      { organization: process.env["SENTRY_ORG"], project: process.env["SENTRY_PROJECT"] },
    ],
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "io.bullify.nutrion-app",
    infoPlist: { NSFaceIDUsageDescription: faceIdText },
  },
  android: {
    package: "io.bullify.nutrion-app",
    permissions: ["android.permission.USE_BIOMETRIC", "android.permission.USE_FINGERPRINT"],
  },
};

export default config;
