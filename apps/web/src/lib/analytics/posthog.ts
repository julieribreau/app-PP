import {
  POSTHOG_EU_HOST,
  POSTHOG_EU_UI_HOST,
  superProperties,
  track as trackEvent,
  type EventCatalog,
  type EventName,
  type PostHogSettings,
} from "@nutrion/analytics";
import type { PostHog } from "posthog-js";

// Seul module qui parle à posthog-js. Le SDK n'est chargé et initialisé qu'au premier oui de
// l'usager : avant, ni script, ni requête, ni stockage (skill frontend-dev §15).
let client: PostHog | null = null;
let loading: Promise<PostHog> | null = null;
let wanted = false;

/** Clé et hôte du build ; la configuration du tenant peut les remplacer (prop de `AppConsent`). */
export function buildPostHogSettings(): PostHogSettings {
  return {
    key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  };
}

function load(key: string, host: string | undefined): Promise<PostHog> {
  loading ??= import("posthog-js").then(({ default: posthog }) => {
    posthog.init(key, {
      api_host: host || POSTHOG_EU_HOST,
      ui_host: POSTHOG_EU_UI_HOST,
      // Rien ne part sans l'appel explicite à `opt_in_capturing` plus bas.
      opt_out_capturing_by_default: true,
      // Opté hors de la mesure, le SDK ne garde rien sur l'appareil.
      opt_out_persistence_by_default: true,
      // Tout ce qui est disponible est suivi (socle §PostHog) : une page vue à chaque changement
      // de route de l'App Router, les départs de page, les clics, envois de formulaire et
      // changements de champ (jamais la valeur saisie). Une zone qui affiche des données
      // personnelles porte la classe `ph-no-capture`.
      autocapture: true,
      capture_pageview: "history_change",
      capture_pageleave: true,
      persistence: "localStorage",
      // L'enregistrement de session rejouerait l'écran, saisies comprises : hors de ce que la
      // politique cookies annonce. Refusé ici, quoi que dise la configuration du projet PostHog.
      disable_session_recording: true,
    });
    client = posthog;
    return posthog;
  });
  return loading;
}

/** Après consentement uniquement. Reprend aussi la mesure après un retrait. */
export async function startPostHog(settings: PostHogSettings): Promise<void> {
  if (!settings.key) return;
  wanted = true;
  const posthog = await load(settings.key, settings.host);
  if (!wanted) return; // retrait arrivé pendant le chargement du SDK
  // Les propriétés communes d'abord : `opt_in_capturing` envoie aussitôt la page vue courante.
  posthog.register(superProperties(process.env.NEXT_PUBLIC_APP_ENV, "web"));
  posthog.opt_in_capturing({ captureEventName: false });
}

/** Refus ou retrait : plus rien ne part, et ce que le SDK gardait sur l'appareil est effacé. */
export function stopPostHog(): void {
  wanted = false;
  // `opt_out_persistence_by_default` : l'opt-out efface aussi le stockage du SDK (identifiant,
  // propriétés) ; seul reste son propre marqueur de refus. Pas de `reset()` : il recharge les
  // drapeaux de fonctionnalité, donc envoie une requête à PostHog après le retrait
  // (constaté par e2e/consent.spec.ts).
  client?.opt_out_capturing();
}

/** Identification : l'identifiant interne du compte, rien d'autre (ni e-mail, ni nom). */
export function identifyUser(userId: string): void {
  client?.identify(userId);
}

export function track<N extends EventName>(name: N, properties: EventCatalog[N]): void {
  trackEvent(client, name, properties);
}

/** Le client courant : null tant que l'usager n'a pas accepté la mesure d'audience. */
export function analyticsClient(): PostHog | null {
  return wanted ? client : null;
}
