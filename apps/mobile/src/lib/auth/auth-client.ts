import { expoClient } from "@better-auth/expo/client";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { withApiEvents } from "@nutrion/analytics";
import * as SecureStore from "expo-secure-store";

import { analyticsClient } from "@/lib/analytics/current-client";
import { API_URL, AUTH_BASE_PATH, AUTH_COOKIE_PREFIX } from "@/lib/api/config";

// Client Better Auth (contrat §Authentification) : e-mail + mot de passe. La session vit dans le
// trousseau (expo-secure-store) ; ses cookies sont rejoués par `getCookie()` sur nos appels /v1.
export const authClient = createAuthClient({
  baseURL: API_URL,
  basePath: AUTH_BASE_PATH,
  // Inscription, connexion, déconnexion : événements du catalogue, après consentement.
  fetchOptions: {
    customFetchImpl: withApiEvents((input, init) => fetch(input, init), analyticsClient),
  },
  plugins: [
    expoClient({
      scheme: "nutrion",
      storagePrefix: "nutrion",
      // Même préfixe que le backend (advanced.cookiePrefix) : le plugin ne garde que les
      // cookies qu'il reconnaît. Avec le préfixe par défaut (« better-auth »), la session
      // « nutrion.session_token » n'était jamais stockée et l'app restait déconnectée.
      cookiePrefix: AUTH_COOKIE_PREFIX,
      storage: SecureStore,
    }),
    inferAdditionalFields({
      user: {
        firstName: { type: "string", required: false },
        lastName: { type: "string", required: false },
        locale: { type: "string", required: false },
        role: { type: "string", required: false, input: false },
      },
    }),
  ],
});

export type AuthSession = typeof authClient.$Infer.Session;
