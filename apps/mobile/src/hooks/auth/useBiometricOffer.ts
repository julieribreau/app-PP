import * as React from "react";
import { Alert } from "react-native";

import { authenticate, biometricSupport, type BiometricKind } from "@/lib/auth/biometric";
import { useI18n } from "@/lib/i18n/useI18n";
import { usePrefsStore } from "@/stores/prefs.store";

/** Libellé du capteur dans la langue courante (« Face ID », « l'empreinte »). */
export function useBiometricLabel() {
  const { t } = useI18n();
  return React.useCallback(
    (kind: BiometricKind) => (kind === "faceId" ? t.auth.faceId : kind === "touchId" ? t.auth.touchId : t.auth.fingerprint),
    [t],
  );
}

/**
 * Après une connexion e-mail réussie : propose une fois par compte d'activer le déverrouillage
 * biométrique, si l'appareil en a un de configuré. Se résout quand l'usager a répondu.
 */
export function useBiometricOffer() {
  const { t, f } = useI18n();
  const label = useBiometricLabel();
  return React.useCallback(
    async (email: string): Promise<void> => {
      const prefs = usePrefsStore.getState();
      if (prefs.biometricEnabled || prefs.biometricAskedFor === email) return;
      const support = await biometricSupport();
      if (!support.available) return;
      prefs.markBiometricAsked(email);
      const method = label(support.kind);
      await new Promise<void>((resolve) => {
        Alert.alert(f(t.mobile.auth.biometricOfferTitle, { method }), t.mobile.auth.biometricOfferBody, [
          { text: t.mobile.auth.later, style: "cancel", onPress: () => resolve() },
          {
            text: t.mobile.auth.biometricOfferAccept,
            onPress: () => {
              void authenticate(t.mobile.auth.biometricPrompt, t.common.cancel).then((ok) => {
                if (ok) usePrefsStore.getState().setBiometric(true);
                resolve();
              });
            },
          },
        ]);
      });
    },
    [f, label, t],
  );
}
