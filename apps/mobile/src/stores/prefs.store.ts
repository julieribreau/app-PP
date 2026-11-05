import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Locale } from "@nutrion/i18n";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { deviceLocale } from "@/lib/i18n/messages";
import type { ThemePreference } from "@/types/api";

// Préférences locales de l'appareil : langue, thème, déverrouillage biométrique. Synchronisées
// avec le profil quand l'usager est connecté (hooks/account/usePrefsSync). Le prénom et l'e-mail
// du dernier compte servent l'écran « Bon retour » : rien de plus sensible n'est gardé ici.

export interface PrefsState {
  hydrated: boolean;
  locale: Locale;
  theme: ThemePreference;
  biometricEnabled: boolean;
  /** La proposition d'activer la biométrie a déjà été faite pour ce compte. */
  biometricAskedFor: string | null;
  lastFirstName: string | null;
  lastEmail: string | null;
  setLocale: (locale: Locale) => void;
  setTheme: (theme: ThemePreference) => void;
  setBiometric: (enabled: boolean) => void;
  markBiometricAsked: (email: string) => void;
  rememberAccount: (account: { firstName: string | null; email: string }) => void;
  forgetAccount: () => void;
}

export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      hydrated: false,
      locale: deviceLocale(),
      theme: "system",
      biometricEnabled: false,
      biometricAskedFor: null,
      lastFirstName: null,
      lastEmail: null,
      setLocale: (locale) => set({ locale }),
      setTheme: (theme) => set({ theme }),
      setBiometric: (biometricEnabled) => set({ biometricEnabled }),
      markBiometricAsked: (email) => set({ biometricAskedFor: email }),
      rememberAccount: ({ firstName, email }) => set({ lastFirstName: firstName, lastEmail: email }),
      forgetAccount: () =>
        set({ biometricEnabled: false, biometricAskedFor: null, lastFirstName: null, lastEmail: null }),
    }),
    {
      name: "nutrion:prefs",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ hydrated: _hydrated, ...rest }) => rest,
      onRehydrateStorage: () => () => usePrefsStore.setState({ hydrated: true }),
    },
  ),
);
