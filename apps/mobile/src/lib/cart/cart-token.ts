// Jeton du panier invité (contrat §Panier invité) : renvoyé par le backend en en-tête
// `X-Cart-Token` au premier ajout, gardé dans le trousseau (expo-secure-store) et renvoyé à
// chaque appel tant que l'usager n'est pas connecté. Effacé après la fusion.

export const CART_TOKEN_HEADER = "X-Cart-Token";
export const CART_TOKEN_KEY = "nutrion_cart_token";

export interface KeyValueStore {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

export interface CartTokenStore {
  get(): Promise<string | null>;
  set(token: string): Promise<void>;
  clear(): Promise<void>;
  /** Lit le jeton d'une réponse ; ne réécrit le trousseau que s'il a changé. */
  captureFrom(headers: Pick<Headers, "get">): Promise<void>;
}

export function createCartTokenStore(storage: KeyValueStore): CartTokenStore {
  // undefined = pas encore lu ; null = lu, aucun jeton.
  let cached: string | null | undefined;
  const store: CartTokenStore = {
    async get() {
      if (cached === undefined) cached = await storage.getItemAsync(CART_TOKEN_KEY);
      return cached;
    },
    async set(token) {
      if (cached === token) return;
      cached = token;
      await storage.setItemAsync(CART_TOKEN_KEY, token);
    },
    async clear() {
      cached = null;
      await storage.deleteItemAsync(CART_TOKEN_KEY);
    },
    async captureFrom(headers) {
      const token = headers.get(CART_TOKEN_HEADER);
      if (token) await store.set(token);
    },
  };
  return store;
}
