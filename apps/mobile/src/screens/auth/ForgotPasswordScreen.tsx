import { router } from "expo-router";
import * as React from "react";

import { Note } from "@/components/layout/Screen";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useAuthActions } from "@/hooks/auth/useSession";
import { isEmail } from "@/lib/auth/validation";
import { useI18n } from "@/lib/i18n/useI18n";
import { usePrefsStore } from "@/stores/prefs.store";
import { AuthLayout } from "@/screens/auth/AuthLayout";

// Mot de passe oublié : le même message s'affiche que le compte existe ou non (pas de fuite).
export function ForgotPasswordScreen() {
  const { t } = useI18n();
  const { requestPasswordReset } = useAuthActions();
  const [email, setEmail] = React.useState(usePrefsStore.getState().lastEmail ?? "");
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const submit = async () => {
    if (!isEmail(email)) return setError(t.mobile.auth.invalidEmail);
    setBusy(true);
    setError(null);
    await requestPasswordReset(email).catch(() => undefined);
    setBusy(false);
    setSent(true);
  };

  return (
    <AuthLayout title={t.auth.resetTitle} lead={t.auth.resetLead}>
      {sent ? <Note>{t.auth.resetSent}</Note> : null}
      <TextField
        testID="forgot-email"
        clearButtonMode="while-editing"
        label={t.auth.email}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        error={error}
      />
      {sent ? (
        <Button
          testID="forgot-back"
          label={t.mobile.auth.backToSignIn}
          variant="outline"
          onPress={() => router.back()}
        />
      ) : (
        <Button
          testID="forgot-submit"
          label={t.auth.resetSend}
          onPress={() => void submit()}
          loading={busy}
        />
      )}
    </AuthLayout>
  );
}
