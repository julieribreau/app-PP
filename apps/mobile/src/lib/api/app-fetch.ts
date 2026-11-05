import { CART_TOKEN_HEADER, type CartTokenStore } from "@/lib/cart/cart-token";

// `fetch` de l'app : ajoute la langue, le cookie de session Better Auth et le jeton du panier
// invité, puis relève le jeton renvoyé par le backend. Passé au port @nutrion/api-port et
// utilisé tel quel pour les appels hors JSON (envoi de photo, export ZIP).

export interface AppFetchDeps {
  getLocale: () => string;
  /** Cookie de session stocké par le client Better Auth (`authClient.getCookie()`). */
  getCookie: () => Promise<string>;
  cartTokens: CartTokenStore;
  fetch?: typeof fetch;
}

export function createAppFetch({
  getLocale,
  getCookie,
  cartTokens,
  fetch: doFetch = fetch,
}: AppFetchDeps) {
  return async function appFetch(input: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set("Accept-Language", getLocale());
    const [cookie, cartToken] = await Promise.all([getCookie(), cartTokens.get()]);
    if (cookie) headers.set("Cookie", cookie);
    if (cartToken) headers.set(CART_TOKEN_HEADER, cartToken);
    const response = await doFetch(input, { ...init, headers, credentials: "omit" });
    await cartTokens.captureFrom(response.headers);
    return response;
  };
}
