import { describe, expect, it, jest } from "@jest/globals";
import { renderHook } from "@testing-library/react-native";
import { Alert, Platform } from "react-native";

import { usePrefsStore } from "@/stores/prefs.store";

import { useBiometricOffer } from "./useBiometricOffer";

describe("offre Face ID après connexion", () => {
  it("parle la langue appliquée par la connexion, pas celle du rendu précédent", async () => {
    Platform.OS = "ios";
    usePrefsStore.setState({ locale: "en", biometricEnabled: false, biometricAskedFor: null });
    const alert = jest.spyOn(Alert, "alert").mockImplementation((_t, _b, buttons) => {
      buttons?.[0]?.onPress?.();
    });
    const { result } = await renderHook(() => useBiometricOffer());
    // Le profil (français) s'applique pendant la connexion, avant l'offre.
    usePrefsStore.setState({ locale: "fr" });
    await result.current("camille.martin@exemple.fr");
    expect(alert.mock.calls[0]?.[0]).toBe("Activer Face ID ?");
  });
});
