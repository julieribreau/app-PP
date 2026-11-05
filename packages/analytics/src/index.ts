import { eventForApiCall, type ApiCall, type EventName } from "./api-events";
import type { EventCatalog } from "./events";

export type { EventCatalog } from "./events";
export { PERSONAL_KEYS } from "./events";
export {
  eventForApiCall,
  normalizePath,
  scrubProperties,
  type ApiCall,
  type EventName,
  type TrackedEvent,
} from "./api-events";

/**
 * Instance PostHog de l'Union européenne : l'ingestion (`api_host`) passe par `eu.i.posthog.com`,
 * l'interface (liens de la barre d'outils) est `eu.posthog.com`. Un tenant peut fournir les siens.
 */
export const POSTHOG_EU_HOST = "https://eu.i.posthog.com";
export const POSTHOG_EU_UI_HOST = "https://eu.posthog.com";

/** Clé et hôte du projet PostHog : de l'environnement du build, ou de la configuration du tenant. */
export interface PostHogSettings {
  readonly key: string | undefined;
  readonly host?: string | undefined;
}

export type Platform = "web" | "mobile";

/** Attachées à chaque événement : l'environnement (`APP_ENV`) et la surface, rien de personnel. */
export function superProperties(
  appEnv: string | undefined,
  platform: Platform,
): { app_env: string; platform: Platform } {
  return { app_env: appEnv || "development", platform };
}

/** Ce que `posthog-js` et `posthog-react-native` ont en commun pour un événement nommé. */
export interface CaptureClient {
  capture(event: string, properties?: Record<string, unknown>): unknown;
}

/** Un événement du catalogue, typé : nom connu, propriétés attendues. */
export function track<N extends EventName>(
  client: CaptureClient | null,
  name: N,
  properties: EventCatalog[N],
): void {
  client?.capture(name, properties);
}

/** L'événement métier d'un appel d'API terminé, envoyé s'il y en a un (et un client : consenti). */
export { reportFetch, withApiEvents } from "./fetch-reporter";

export function trackApiCall(client: CaptureClient | null, call: ApiCall): void {
  if (!client) return;
  const event = eventForApiCall(call);
  if (event) client.capture(event.name, event.properties as Record<string, unknown>);
}
