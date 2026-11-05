import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Sentry from "@sentry/react-native";
import { ConsentProvider } from "@nutrion/cmp";
import { scrubEvent } from "@nutrion/sentry/scrub";
import { scrubSpan, stripQueryStrings } from "@nutrion/sentry/strip-query";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AnalyticsGate } from "@/components/consent/AnalyticsGate";
import { ConsentSheet } from "@/components/consent/ConsentSheet";
import { AppProviders } from "@/components/layout/AppProviders";
import { buildPostHogSettings } from "@/lib/analytics/posthog";
import { useI18n } from "@/lib/i18n/useI18n";
import { useTheme } from "@/theme/useTheme";

// app/ = NAVIGATION pure (expo-router). La logique vit dans src/ (screens/hooks/lib/stores).
// Sentry initialisé ici dès l'init (socle observabilité). PostHog : seulement après
// consentement, par AnalyticsGate (skill mobile-dev-expo §8).
const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
// Posé par le profil de build (eas.json) : development, preprod ou production.
const environment = process.env.EXPO_PUBLIC_APP_ENV ?? "development";

if (dsn) {
  Sentry.init({
    dsn,
    environment,
    // La release (identifiant de l'app, version, build) est posée par le SDK.
    tracesSampleRate: environment === "production" ? 0.1 : 0,
    // @sentry/react-native 8 repose sur le SDK JavaScript 10 : `sendDefaultPii: false`
    // reste la protection (le `dataCollection` de la 11 n'y existe pas encore).
    sendDefaultPii: false,
    initialScope: { tags: { app: "mobile", env: environment } },
    // Ce que NOTRE code met dans un message ou un fil d'Ariane (scrub.ts), puis les chaînes
    // de requête des URL appelées, que les fils d'Ariane `fetch` portent (strip-query.ts).
    beforeSend: (event) => stripQueryStrings(scrubEvent(event)),
    beforeSendTransaction: stripQueryStrings,
    beforeSendSpan: scrubSpan,
  });
}

// Constante de module, comme la `config` du consentement quand un tenant passe la sienne
// (finalités, version de la politique) : les changer à chaque rendu relirait le stockage.
const posthogSettings = buildPostHogSettings();

function Navigation() {
  const { t } = useI18n();
  const { color } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: color.background },
        headerTintColor: color.foreground,
        headerTitleStyle: { fontFamily: "DMSans_600SemiBold" },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: color.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="product/[slug]" options={{ headerShown: false }} />
      <Stack.Screen name="auth/sign-in" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="auth/sign-up" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen
        name="auth/forgot-password"
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen name="account/profile" options={{ title: t.account.profile }} />
      <Stack.Screen name="account/addresses" options={{ title: t.account.addressesTitle }} />
      <Stack.Screen name="account/address/[id]" options={{ title: t.mobile.account.editAddress }} />
      <Stack.Screen name="account/preferences" options={{ title: t.account.preferences }} />
      <Stack.Screen name="account/security" options={{ title: t.account.security }} />
      <Stack.Screen name="account/data" options={{ title: t.account.data }} />
      <Stack.Screen name="privacy" options={{ title: t.settings.privacy }} />
    </Stack>
  );
}

function RootLayout() {
  return (
    <SafeAreaProvider>
      <ConsentProvider store={AsyncStorage}>
        <AppProviders>
          <AnalyticsGate settings={posthogSettings}>
            <Navigation />
          </AnalyticsGate>
        </AppProviders>
        <ConsentSheet />
      </ConsentProvider>
    </SafeAreaProvider>
  );
}

// Plantage du rendu, erreurs non rattrapées : capturés par l'enveloppe du SDK.
export default Sentry.wrap(RootLayout);
