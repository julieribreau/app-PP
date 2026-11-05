import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  POSTHOG_EU_HOST,
  superProperties,
  track as trackEvent,
  type EventCatalog,
  type EventName,
  type PostHogSettings,
} from "@nutrion/analytics";
import PostHog, { PostHogPersistedProperty } from "posthog-react-native";

// Seul module qui parle à posthog-react-native. Le client n'est créé qu'au premier oui de
// l'usager : avant, aucune instance, donc ni requête ni stockage (skill mobile-dev-expo §8).
let client: PostHog | null = null;
let optedIn = false;

/** Clé et hôte du profil de build ; la configuration du tenant peut les remplacer. */
export function buildPostHogSettings(): PostHogSettings {
  return {
    key: process.env.EXPO_PUBLIC_POSTHOG_KEY,
    host: process.env.EXPO_PUBLIC_POSTHOG_HOST,
  };
}

// AsyncStorage plutôt que le stockage par fichier que le SDK choisirait seul : un seul
// mécanisme pour la preuve du consentement et l'état du SDK, sous un préfixe identifiable.
const storage = {
  getItem: (key: string) => AsyncStorage.getItem(`posthog:${key}`),
  setItem: (key: string, value: string) => AsyncStorage.setItem(`posthog:${key}`, value),
};

/** Après consentement uniquement. Reprend aussi la mesure après un retrait. */
export function startAnalytics(settings: PostHogSettings): PostHog | null {
  if (!settings.key) return null;
  client ??= new PostHog(settings.key, {
    host: settings.host || POSTHOG_EU_HOST,
    customStorage: storage,
    // Ouverture, passage en arrière-plan, installation et mise à jour de l'app.
    captureAppLifecycleEvents: true,
    // Les drapeaux de fonctionnalité viennent de la configuration du tenant, pas de PostHog.
    // Sans cette option, `reset()` (au retrait) les rechargerait : une requête après le non.
    disableRemoteFeatureFlags: true,
  });
  // Un retrait d'un lancement précédent reste mémorisé par le SDK : le oui d'aujourd'hui l'annule.
  optedIn = true;
  void client.optIn();
  void client.register(superProperties(process.env.EXPO_PUBLIC_APP_ENV, "mobile"));
  return client;
}

/** Refus ou retrait : ce que le SDK gardait est effacé, puis plus rien ne part. */
export async function stopAnalytics(): Promise<void> {
  optedIn = false;
  if (!client) return;
  // Identifiants et propriétés. `reset()` garde la file d'événements en attente : vidée aussi,
  // rien de ce qui attendait ne partira. Puis l'opt-out, après : `reset()` remet le consentement
  // du SDK à son défaut.
  client.reset();
  client.setPersistedProperty(PostHogPersistedProperty.Queue, null);
  await client.optOut();
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
  return optedIn ? client : null;
}
