"use client";

import type { PostHogSettings } from "@nutrion/analytics";
import { useConsent, useConsentContext } from "@nutrion/cmp";
import * as React from "react";

import { startPostHog, stopPostHog } from "@/lib/analytics/posthog";

/**
 * Ne rend rien : démarre PostHog au oui de l'usager pour la mesure d'audience, l'arrête au refus
 * ou au retrait. Tant que le choix stocké n'est pas lu, rien ne bouge.
 */
export function PostHogInit({ settings }: { readonly settings: PostHogSettings }): null {
  const { ready } = useConsentContext();
  const granted = useConsent("analytics");
  const { key, host } = settings;

  React.useEffect(() => {
    if (!ready) return;
    if (granted) void startPostHog({ key, host });
    else stopPostHog();
  }, [ready, granted, key, host]);

  return null;
}
