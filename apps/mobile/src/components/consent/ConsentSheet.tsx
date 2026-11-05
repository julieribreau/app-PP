import { ConsentBanner } from "@nutrion/cmp/native";
import { router, usePathname } from "expo-router";
import * as React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useI18n } from "@/lib/i18n/useI18n";
import { PRIVACY_ROUTE } from "@/lib/routes";

/** Feuille du premier lancement ; masquée sur l'écran Confidentialité, qu'elle recouvrirait. */
export function ConsentSheet(): React.JSX.Element | null {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  if (pathname === PRIVACY_ROUTE) return null;
  return (
    <ConsentBanner
      copy={t.consent}
      bottomInset={insets.bottom}
      onCustomize={() => router.push(PRIVACY_ROUTE)}
    />
  );
}
