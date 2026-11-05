// Doublures des modules natifs absents sous jest-expo (aucun appareil derrière).
import { jest } from "@jest/globals";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest"),
);

jest.mock("expo-localization", () => ({
  getLocales: () => [{ languageCode: "fr", languageTag: "fr-FR" }],
}));

jest.mock("expo-secure-store", () => {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    getItemAsync: async (key: string) => data.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => void data.set(key, value),
    deleteItemAsync: async (key: string) => void data.delete(key),
  };
});

jest.mock("expo-local-authentication", () => ({
  AuthenticationType: { FINGERPRINT: 1, FACIAL_RECOGNITION: 2, IRIS: 3 },
  hasHardwareAsync: jest.fn(async () => true),
  isEnrolledAsync: jest.fn(async () => true),
  supportedAuthenticationTypesAsync: jest.fn(async () => [2]),
  authenticateAsync: jest.fn(async () => ({ success: true })),
}));

jest.mock(
  "react-native-safe-area-context",
  () =>
    (jest.requireActual("react-native-safe-area-context/jest/mock") as { default: unknown })
      .default,
);
