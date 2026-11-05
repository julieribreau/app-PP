import { ConsentBanner } from "@nutrion/cmp/native";
import { router, usePathname } from "expo-router";
import * as React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { messages } from "@/lib/i18n/messages";
import { PRIVACY_ROUTE } from "@/lib/routes";

/** Feuille du premier lancement ; masquée sur l'écran Confidentialité, qu'elle recouvrirait. */
export function ConsentSheet(): React.JSX.Element | null {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  if (pathname === PRIVACY_ROUTE) return null;
  return (
    <ConsentBanner
      copy={messages().consent}
      bottomInset={insets.bottom}
      onCustomize={() => router.push(PRIVACY_ROUTE)}
    />
  );
}
