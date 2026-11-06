import type { CaptureClient } from "@nutrion/analytics";

// Le client PostHog courant, sans importer le SDK : la couche HTTP et le client Better Auth
// s'en servent pour les événements métier. Posé par posthog.ts au oui de l'usager, retiré au
// refus ; null tant qu'aucun consentement n'est donné.
let current: CaptureClient | null = null;

export function setAnalyticsClient(client: CaptureClient | null): void {
  current = client;
}

export function analyticsClient(): CaptureClient | null {
  return current;
}
