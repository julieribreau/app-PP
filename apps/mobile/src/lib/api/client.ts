import { ApiError, createApiClient } from "@nutrion/api-port";
import * as SecureStore from "expo-secure-store";

import { createAppFetch } from "@/lib/api/app-fetch";
import { API_V1 } from "@/lib/api/config";
import { fileFormData, type LocalFile } from "@/lib/api/upload";
import { authClient } from "@/lib/auth/auth-client";
import { createCartTokenStore } from "@/lib/cart/cart-token";
import { usePrefsStore } from "@/stores/prefs.store";

// Le backend s'appelle uniquement par le port partagé @nutrion/api-port, ici branché sur le
// `fetch` de l'app (langue, session, panier invité).
export const cartTokens = createCartTokenStore(SecureStore);

export const appFetch = createAppFetch({
  getLocale: () => usePrefsStore.getState().locale,
  getCookie: async () => authClient.getCookie(),
  cartTokens,
});

export const api = createApiClient({
  baseUrl: API_V1,
  fetch: (input, init) => appFetch(String(input), init),
});

/** Envoi multipart (photo de profil) : hors JSON, même en-têtes que le reste. */
export async function uploadFile<T>(path: string, file: LocalFile) {
  const res = await appFetch(`${API_V1}${path}`, { method: "PUT", body: fileFormData(file) });
  const text = await res.text();
  const data: unknown = text ? JSON.parse(text) : undefined;
  if (!res.ok) throw new ApiError(res.status, (data as { code?: string } | undefined)?.code, data);
  return data as T;
}

export { ApiError };
