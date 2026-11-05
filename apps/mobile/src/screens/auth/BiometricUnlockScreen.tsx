import { router } from "expo-router";
import * as React from "react";
import { StyleSheet, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { useBiometricLabel } from "@/hooks/auth/useBiometricOffer";
import { useAuthActions } from "@/hooks/auth/useSession";
import { authenticate, biometricSupport, type BiometricKind } from "@/lib/auth/biometric";
import { useI18n } from "@/lib/i18n/useI18n";
import { FORGOT_PASSWORD_ROUTE } from "@/lib/routes";
import { useLockStore } from "@/stores/lock.store";
import { usePrefsStore } from "@/stores/prefs.store";
import { AuthLayout, OrDivider, TextLink } from "@/screens/auth/AuthLayout";
import { SignInForm } from "@/screens/auth/SignInScreen";

// « Bon retour, {prénom} » (canvas ConnexionMobile) : la session est gardée, la biométrie la
// déverrouille ; repli e-mail + mot de passe sur le même écran.

export function BiometricUnlockScreen() {
  const { t, f } = useI18n();
  const label = useBiometricLabel();
  const unlock = useLockStore((s) => s.unlock);
  const { signOut } = useAuthActions();
  const firstName = usePrefsStore((s) => s.lastFirstName);
  const lastEmail = usePrefsStore((s) => s.lastEmail);
  const [kind, setKind] = React.useState<BiometricKind | null>(null);
  const tried = React.useRef(false);

  const tryBiometric = React.useCallback(async () => {
    const ok = await authenticate(t.mobile.auth.biometricPrompt, t.common.cancel);
    if (ok) unlock();
  }, [t, unlock]);

  React.useEffect(() => {
    void biometricSupport().then((support) => {
      if (!support.available) return;
      setKind(support.kind);
      if (!tried.current) {
        tried.current = true;
        void tryBiometric();
      }
    });
  }, [tryBiometric]);

  return (
    <AuthLayout
      closable={false}
      title={firstName ? f(t.auth.welcomeBackName, { name: firstName }) : t.auth.welcomeBack}
      lead={t.auth.biometricUnlock}
    >
      {kind ? (
        <>
          <Button
            testID="biometric-unlock"
            size="lg"
            icon={kind === "fingerprint" ? "fingerprint" : "scanFace"}
            label={f(t.auth.biometric, { method: label(kind) })}
            onPress={() => void tryBiometric()}
          />
          <OrDivider />
        </>
      ) : null}
      <SignInForm initialEmail={lastEmail ?? ""} onSignedIn={unlock} secondary={kind !== null} />
      <View style={styles.links}>
        <TextLink
          label={t.auth.forgot}
          onPress={() => {
            void signOut().then(() => {
              unlock();
              router.push(FORGOT_PASSWORD_ROUTE);
            });
          }}
        />
        <TextLink
          testID="unlock-other-account"
          strong
          label={t.mobile.auth.otherAccount}
          onPress={() => void signOut({ forget: true }).then(unlock)}
        />
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  links: { flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: 8 },
});
