// lib/<domaine>/ — clients et intégrations isolés par domaine.
// Le backend s'appelle uniquement par le port partagé @nutrion/api-port, jamais par un fetch direct.
import { createApiClient } from "@nutrion/api-port";

export const api = createApiClient({
  baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3001/v1",
  // ponytail: ajouter ici le jeton de session (expo-secure-store), la langue et le tenant.
  headers: () => ({}),
});
