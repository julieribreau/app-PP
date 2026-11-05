import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as LocalAuthentication from "expo-local-authentication";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Platform } from "react-native";

import { useLockStore } from "@/stores/lock.store";
import { usePrefsStore } from "@/stores/prefs.store";
import { renderWithProviders } from "@/test/render";

import { BiometricUnlockScreen } from "./BiometricUnlockScreen";

jest.mock("expo-router", () => ({ router: require("@/test/api-mock").routerMock }));
jest.mock("@/hooks/auth/useSession", () => ({
  useSession: () => ({ data: null, isPending: false }),
  useAuthActions: () => ({
    signIn: jest.fn(async () => ({ ok: true })),
    signOut: jest.fn(async () => undefined),
    signUp: jest.fn(),
    requestPasswordReset: jest.fn(),
  }),
}));

const authenticate = LocalAuthentication.authenticateAsync as unknown as jest.Mock<() => Promise<{ success: boolean }>>;

describe("déverrouillage biométrique", () => {
  beforeEach(() => {
    Platform.OS = "ios";
    usePrefsStore.setState({ lastFirstName: "Camille", lastEmail: "camille.martin@exemple.fr", locale: "fr" });
    useLockStore.getState().lock();
    authenticate.mockReset();
  });

  it("accueille par le prénom et propose Face ID", async () => {
    authenticate.mockResolvedValue({ success: false });
    await renderWithProviders(<BiometricUnlockScreen />);
    expect(screen.getByText("Bon retour, Camille")).toBeTruthy();
    expect(await screen.findByText("Se connecter avec Face ID")).toBeTruthy();
    expect(screen.getByDisplayValue("camille.martin@exemple.fr")).toBeTruthy();
    expect(useLockStore.getState().status).toBe("locked");
  });

  it("déverrouille l'app quand la biométrie réussit", async () => {
    authenticate.mockResolvedValueOnce({ success: false }).mockResolvedValueOnce({ success: true });
    await renderWithProviders(<BiometricUnlockScreen />);
    await fireEvent.press(await screen.findByTestId("biometric-unlock"));
    await waitFor(() => expect(useLockStore.getState().status).toBe("unlocked"));
  });
});
