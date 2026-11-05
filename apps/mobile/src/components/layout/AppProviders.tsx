import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as React from "react";
import { StyleSheet, View } from "react-native";

import { usePrefsSync } from "@/hooks/account/usePreferences";
import { useCartFollowsLocale } from "@/hooks/cart/useCart";
import { queryClient } from "@/lib/api/query";
import { authClient } from "@/lib/auth/auth-client";
import { BiometricUnlockScreen } from "@/screens/auth/BiometricUnlockScreen";
import { initialLockStatus, useLockStore } from "@/stores/lock.store";
import { usePrefsStore } from "@/stores/prefs.store";
import { appFonts } from "@/theme/fonts";
import { statusBarStyleFor, useApplyThemePreference, useTheme } from "@/theme/useTheme";

// Démarrage : l'écran de lancement reste affiché tant que les polices, les préférences et la
// décision de verrouillage ne sont pas prêtes (pas de saut de police ni de flash du mauvais thème).
void SplashScreen.preventAutoHideAsync();

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <Boot>{children}</Boot>
    </QueryClientProvider>
  );
}

function Boot({ children }: { children: React.ReactNode }) {
  const [fontsLoaded, fontError] = useFonts(appFonts);
  const hydrated = usePrefsStore((s) => s.hydrated);
  const status = useLockStore((s) => s.status);
  const theme = useTheme();
  useApplyThemePreference();
  usePrefsSync();
  useCartFollowsLocale();

  React.useEffect(() => {
    if (!hydrated || useLockStore.getState().status !== "checking") return;
    void authClient.getCookie().then((cookie) => {
      const next = initialLockStatus({
        biometricEnabled: usePrefsStore.getState().biometricEnabled,
        hasStoredSession: Boolean(cookie),
      });
      if (next === "locked") useLockStore.getState().lock();
      else useLockStore.getState().unlock();
    });
  }, [hydrated]);

  const ready = (fontsLoaded || fontError !== null) && hydrated && status !== "checking";
  React.useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;
  return (
    <View style={[styles.flex, { backgroundColor: theme.color.background }]}>
      <StatusBar style={statusBarStyleFor(theme.name)} />
      {children}
      {status === "locked" ? (
        <View style={StyleSheet.absoluteFill}>
          <BiometricUnlockScreen />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
