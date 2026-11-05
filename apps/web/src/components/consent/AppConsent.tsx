"use client";

import type { PostHogSettings } from "@nutrion/analytics";
import { browserStore, ConsentProvider } from "@nutrion/cmp";
import type { ConsentConfig, ConsentCopy } from "@nutrion/cmp";
import { ConsentBanner, ConsentManager } from "@nutrion/cmp/web";
import { useLocale, useMessages } from "next-intl";
import * as React from "react";

import { buildPostHogSettings } from "@/lib/analytics/posthog";

import { PostHogInit } from "./PostHogInit";

const store = browserStore();

export interface AppConsentProps {
  readonly children: React.ReactNode;
  /** Finalités et version de la politique du tenant ; défaut : essentiel et mesure d'audience. */
  readonly config?: ConsentConfig;
  /** Projet PostHog du tenant ; défaut : celui du build. */
  readonly posthog?: PostHogSettings;
  /** Textes propres au tenant ; défaut : `consent` du dictionnaire de la langue courante. */
  readonly copy?: ConsentCopy;
  readonly policyHref?: string;
}

/**
 * Consentement de toute l'app web : bandeau au premier passage, gestionnaire, et PostHog branché
 * sur la réponse. Le layout (composant serveur) ne peut pas passer de fonction au fournisseur :
 * ce composant client fait le lien.
 */
export function AppConsent(props: AppConsentProps): React.JSX.Element {
  const { children, config, posthog, policyHref } = props;
  const locale = useLocale();
  const messages = useMessages() as unknown as { consent: ConsentCopy };
  const copy = props.copy ?? messages.consent;
  const settings = React.useMemo(() => posthog ?? buildPostHogSettings(), [posthog]);

  return (
    <ConsentProvider config={config} store={store}>
      {children}
      <ConsentBanner copy={copy} policyHref={policyHref} />
      <ConsentManager copy={copy} locale={locale} />
      <PostHogInit settings={settings} />
    </ConsentProvider>
  );
}
