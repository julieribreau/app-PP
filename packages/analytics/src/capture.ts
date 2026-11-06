import { eventForApiCall, type ApiCall } from "./api-events";

/** Ce que `posthog-js` et `posthog-react-native` ont en commun pour un événement nommé. */
export interface CaptureClient {
  capture(event: string, properties?: Record<string, unknown>): unknown;
}

/** L'événement métier d'un appel d'API terminé, envoyé s'il y en a un (et un client : consenti). */
export function trackApiCall(client: CaptureClient | null, call: ApiCall): void {
  if (!client) return;
  const event = eventForApiCall(call);
  if (event) client.capture(event.name, event.properties as Record<string, unknown>);
}
