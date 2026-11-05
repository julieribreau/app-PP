// Doublures des modules natifs absents sous jest-expo (aucun appareil derrière).
/* global jest */
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest"),
);

jest.mock("expo-localization", () => ({
  getLocales: () => [{ languageCode: "fr", languageTag: "fr-FR" }],
}));

jest.mock("expo-secure-store", () => {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    getItemAsync: async (key) => data.get(key) ?? null,
    setItemAsync: async (key, value) => void data.set(key, value),
    deleteItemAsync: async (key) => void data.delete(key),
  };
});

jest.mock("expo-local-authentication", () => ({
  AuthenticationType: { FINGERPRINT: 1, FACIAL_RECOGNITION: 2, IRIS: 3 },
  hasHardwareAsync: jest.fn(async () => true),
  isEnrolledAsync: jest.fn(async () => true),
  supportedAuthenticationTypesAsync: jest.fn(async () => [2]),
  authenticateAsync: jest.fn(async () => ({ success: true })),
}));

jest.mock("react-native-safe-area-context", () => require("react-native-safe-area-context/jest/mock").default);
