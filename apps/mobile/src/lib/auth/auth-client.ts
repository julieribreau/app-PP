import { expoClient } from "@better-auth/expo/client";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

import { API_URL, AUTH_BASE_PATH } from "@/lib/api/config";

// Client Better Auth (contrat §Authentification) : e-mail + mot de passe. La session vit dans le
// trousseau (expo-secure-store) ; ses cookies sont rejoués par `getCookie()` sur nos appels /v1.
export const authClient = createAuthClient({
  baseURL: API_URL,
  basePath: AUTH_BASE_PATH,
  plugins: [
    expoClient({ scheme: "nutrion", storagePrefix: "nutrion", storage: SecureStore }),
    inferAdditionalFields({
      user: {
        firstName: { type: "string", required: false },
        lastName: { type: "string", required: false },
        role: { type: "string", required: false, input: false },
      },
    }),
  ],
});

export type AuthSession = typeof authClient.$Infer.Session;
