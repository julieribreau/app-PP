import type { PostHogSettings } from "@nutrion/analytics";
import { useConsent, useConsentContext } from "@nutrion/cmp";
import { usePathname } from "expo-router";
import type PostHog from "posthog-react-native";
import { PostHogProvider } from "posthog-react-native";
import * as React from "react";

import { startAnalytics, stopAnalytics } from "@/lib/analytics/posthog";

export interface AnalyticsGateProps {
  readonly settings: PostHogSettings;
  readonly children: React.ReactNode;
}

/**
 * PostHog suit le consentement « mesure d'audience » : client créé au oui, coupé et purgé au
 * refus ou au retrait. Un écran vu à chaque changement de route, les touchers par le fournisseur
 * du SDK.
 *
 * Le fournisseur enveloppe la navigation : le poser ou le retirer en cours de session remonterait
 * tous les écrans. Il se fixe donc au premier choix connu de la session (au premier lancement, le
 * oui donné depuis l'accueil) ; un changement d'avis ultérieur le suit au lancement suivant, et
 * d'ici là un client opté hors de la mesure n'envoie rien.
 */
export function AnalyticsGate({
  settings,
  children,
}: AnalyticsGateProps): React.JSX.Element | null {
  const { ready, record } = useConsentContext();
  const granted = useConsent("analytics");
  const [client, setClient] = React.useState<PostHog | null>(null);
  const [wrapper, setWrapper] = React.useState<PostHog | null | undefined>(undefined);
  const { key, host } = settings;

  React.useEffect(() => {
    if (!ready) return;
    if (granted) setClient(startAnalytics({ key, host }));
    else void stopAnalytics();
  }, [ready, granted, key, host]);

  const settled = ready && record !== null && (!granted || client !== null || !key);
  React.useEffect(() => {
    if (wrapper === undefined && settled) setWrapper(granted ? client : null);
  }, [wrapper, settled, granted, client]);

  // Choix déjà stocké : on attend de savoir s'il faut le fournisseur, pour ne rendre qu'une fois.
  if (!ready || (record !== null && wrapper === undefined)) return null;

  return (
    <>
      {wrapper ? (
        <PostHogProvider
          client={wrapper}
          autocapture={{ captureTouches: true, captureScreens: false }}
        >
          {children}
        </PostHogProvider>
      ) : (
        children
      )}
      <ScreenTracker client={granted ? client : null} />
    </>
  );
}

/** Feuille de l'arbre, pas la racine : seul ce composant se rend à chaque navigation. */
function ScreenTracker({ client }: { readonly client: PostHog | null }): null {
  const pathname = usePathname();
  React.useEffect(() => {
    if (client) void client.screen(pathname);
  }, [client, pathname]);
  return null;
}
