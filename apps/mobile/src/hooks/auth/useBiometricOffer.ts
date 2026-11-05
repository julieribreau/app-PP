import * as React from "react";
import { Alert } from "react-native";

import { authenticate, biometricSupport, type BiometricKind } from "@/lib/auth/biometric";
import { formatMessage } from "@/lib/format/format";
import { messages, type Messages } from "@/lib/i18n/messages";
import { useI18n } from "@/lib/i18n/useI18n";
import { usePrefsStore } from "@/stores/prefs.store";

function biometricLabel(t: Messages, kind: BiometricKind): string {
  if (kind === "faceId") return t.auth.faceId;
  return kind === "touchId" ? t.auth.touchId : t.auth.fingerprint;
}

/** Libellé du capteur dans la langue courante (« Face ID », « l'empreinte »). */
export function useBiometricLabel() {
  const { t } = useI18n();
  return React.useCallback((kind: BiometricKind) => biometricLabel(t, kind), [t]);
}

/**
 * Après une connexion e-mail réussie : propose une fois par compte d'activer le déverrouillage
 * biométrique, si l'appareil en a un de configuré. Se résout quand l'usager a répondu.
 *
 * Les textes sont pris dans la langue du moment de l'offre, pas celle du rendu : la connexion
 * applique la langue du profil juste avant, et l'alerte sortait sinon dans l'ancienne langue.
 */
export function useBiometricOffer() {
  return React.useCallback(async (email: string): Promise<void> => {
    const prefs = usePrefsStore.getState();
    if (prefs.biometricEnabled || prefs.biometricAskedFor === email) return;
    const support = await biometricSupport();
    if (!support.available) return;
    prefs.markBiometricAsked(email);
    const locale = usePrefsStore.getState().locale;
    const t = messages(locale);
    const method = biometricLabel(t, support.kind);
    await new Promise<void>((resolve) => {
      Alert.alert(
        formatMessage(t.mobile.auth.biometricOfferTitle, { method }, locale),
        t.mobile.auth.biometricOfferBody,
        [
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
        ],
      );
    });
  }, []);
}
