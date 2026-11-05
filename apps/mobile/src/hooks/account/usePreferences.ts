import { isLocale, type Locale } from "@nutrion/i18n";
import * as React from "react";

import { useMe, useUpdateMe } from "@/hooks/account/useAccount";
import { usePrefsStore } from "@/stores/prefs.store";
import type { ThemePreference } from "@/types/api";

/**
 * Au chargement du profil, la langue et le thème enregistrés sur le compte s'appliquent à
 * l'appareil (une fois par compte et par lancement : un changement local ne rebondit pas).
 */
export function usePrefsSync(): void {
  const me = useMe();
  const syncedFor = React.useRef<string | null>(null);
  React.useEffect(() => {
    const profile = me.data;
    if (!profile || syncedFor.current === profile.id) return;
    syncedFor.current = profile.id;
    const prefs = usePrefsStore.getState();
    if (isLocale(profile.locale) && profile.locale !== prefs.locale) prefs.setLocale(profile.locale);
    if (profile.theme !== prefs.theme) prefs.setTheme(profile.theme);
    prefs.rememberAccount({ firstName: profile.firstName, email: profile.email });
  }, [me.data]);
}

/** Change une préférence sur l'appareil et, connecté, sur le profil. */
export function usePreferenceActions() {
  const me = useMe();
  const update = useUpdateMe();
  const setLocale = usePrefsStore((s) => s.setLocale);
  const setTheme = usePrefsStore((s) => s.setTheme);
  const signedIn = Boolean(me.data);
  return {
    changeLocale: (locale: Locale) => {
      setLocale(locale);
      if (signedIn) update.mutate({ locale });
    },
    changeTheme: (theme: ThemePreference) => {
      setTheme(theme);
      if (signedIn) update.mutate({ theme });
    },
  };
}
