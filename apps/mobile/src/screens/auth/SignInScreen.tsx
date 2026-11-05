import { router } from "expo-router";
import * as React from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useBiometricOffer } from "@/hooks/auth/useBiometricOffer";
import { useAuthActions, type AuthErrorKind } from "@/hooks/auth/useSession";
import { isEmail } from "@/lib/auth/validation";
import { useI18n } from "@/lib/i18n/useI18n";
import { FORGOT_PASSWORD_ROUTE, SIGN_UP_ROUTE } from "@/lib/routes";
import { usePrefsStore } from "@/stores/prefs.store";
import { AuthLayout, TextLink } from "@/screens/auth/AuthLayout";

/** Formulaire e-mail + mot de passe, réutilisé par l'écran de déverrouillage. */
export function SignInForm({
  onSignedIn,
  initialEmail = "",
  secondary = false,
}: {
  onSignedIn: () => void;
  initialEmail?: string;
  /** Bouton en contour quand un autre geste est le principal (déverrouillage biométrique). */
  secondary?: boolean;
}) {
  const { t } = useI18n();
  const { signIn } = useAuthActions();
  const offerBiometric = useBiometricOffer();
  const [email, setEmail] = React.useState(initialEmail);
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const messageFor = (kind: AuthErrorKind) =>
    kind === "invalidCredentials"
      ? t.auth.invalidCredentials
      : kind === "locked"
        ? t.auth.locked
        : kind === "emailNotVerified"
          ? t.auth.emailNotVerified
          : t.common.error;

  const submit = async () => {
    if (!isEmail(email)) return setError(t.mobile.auth.invalidEmail);
    if (!password) return setError(t.mobile.auth.requiredField);
    setBusy(true);
    setError(null);
    try {
      const result = await signIn(email, password);
      if (!result.ok) return setError(messageFor(result.error ?? "generic"));
      await offerBiometric(email.trim());
      onSignedIn();
    } catch {
      setError(t.common.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.form}>
      <TextField
        label={t.auth.email}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="username"
      />
      <TextField
        label={t.auth.password}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        onSubmitEditing={() => void submit()}
        returnKeyType="go"
        error={error}
      />
      <Button
        testID="sign-in-submit"
        label={t.auth.signIn}
        variant={secondary ? "outline" : "primary"}
        onPress={() => void submit()}
        loading={busy}
      />
      <AppText variant="help">{t.auth.mergeNote}</AppText>
    </View>
  );
}

export function SignInScreen() {
  const { t } = useI18n();
  const lastEmail = usePrefsStore((s) => s.lastEmail);
  return (
    <AuthLayout title={t.auth.welcomeBack} lead={t.auth.signInLead}>
      <SignInForm
        initialEmail={lastEmail ?? ""}
        onSignedIn={() => (router.canGoBack() ? router.back() : router.replace("/"))}
      />
      <View style={styles.links}>
        <TextLink label={t.auth.forgot} onPress={() => router.push(FORGOT_PASSWORD_ROUTE)} />
        <TextLink strong label={t.auth.signUpTab} onPress={() => router.replace(SIGN_UP_ROUTE)} />
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  links: { flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: 8 },
});
