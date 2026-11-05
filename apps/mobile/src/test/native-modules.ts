import { vi } from "vitest";

// Doubles en mémoire des SEULS modules natifs, pour faire tourner le code réel de l'app sous
// Node contre le backend (vitest.integration.config.mts). Rien d'autre n'est simulé : fetch,
// client API, Better Auth et stores sont les vrais.

const keychain = new Map<string, string>();
export const memoryKeychain = keychain;

vi.mock("expo-secure-store", () => ({
  getItemAsync: async (k: string) => keychain.get(k) ?? null,
  setItemAsync: async (k: string, v: string) => void keychain.set(k, v),
  deleteItemAsync: async (k: string) => void keychain.delete(k),
  getItem: (k: string) => keychain.get(k) ?? null,
  setItem: (k: string, v: string) => void keychain.set(k, v),
}));

const asyncStorage = new Map<string, string>();
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: async (k: string) => asyncStorage.get(k) ?? null,
    setItem: async (k: string, v: string) => void asyncStorage.set(k, v),
    removeItem: async (k: string) => void asyncStorage.delete(k),
  },
}));

vi.mock("react-native", () => ({
  Platform: { OS: "ios", select: (o: Record<string, unknown>) => o["ios"] ?? o["default"] },
  AppState: { currentState: "active", addEventListener: () => ({ remove: () => undefined }) },
}));

vi.mock("expo-constants", () => ({ default: { expoConfig: { scheme: "nutrion" } } }));
vi.mock("expo-linking", () => ({
  createURL: (path: string) => `nutrion://${path.replace(/^\//, "")}`,
}));
vi.mock("expo-network", () => ({
  addNetworkStateListener: () => ({ remove: () => undefined }),
  getNetworkStateAsync: async () => ({ isConnected: true, isInternetReachable: true }),
}));
vi.mock("expo-web-browser", () => ({ openAuthSessionAsync: async () => ({ type: "dismiss" }) }));
vi.mock("expo-localization", () => ({ getLocales: () => [{ languageCode: "fr" }] }));
