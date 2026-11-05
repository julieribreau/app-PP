import { router } from "expo-router";
import * as React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { TextField, type TextFieldHandle } from "@/components/ui/TextField";
import { useAuthActions } from "@/hooks/auth/useSession";
import { isEmail, isStrongPassword } from "@/lib/auth/validation";
import { useI18n } from "@/lib/i18n/useI18n";
import { SIGN_IN_ROUTE } from "@/lib/routes";
import { useTheme } from "@/theme/useTheme";
import { AuthLayout, TextLink } from "@/screens/auth/AuthLayout";

// Création de compte : prénom, nom, e-mail, mot de passe, acceptation des CGU. Le compte n'est
// utilisable qu'après la confirmation de l'e-mail (contrat §Authentification).

export function SignUpScreen() {
  const { t, f } = useI18n();
  const { signUp } = useAuthActions();
  const [form, setForm] = React.useState({ firstName: "", lastName: "", email: "", password: "" });
  const [accepted, setAccepted] = React.useState(false);
  const [errors, setErrors] = React.useState<
    Partial<Record<keyof typeof form | "terms" | "form", string>>
  >({});
  const [busy, setBusy] = React.useState(false);
  const [sentTo, setSentTo] = React.useState<string | null>(null);
  const set = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    const next: typeof errors = {};
    if (!form.firstName.trim()) next.firstName = t.mobile.auth.requiredField;
    if (!form.lastName.trim()) next.lastName = t.mobile.auth.requiredField;
    if (!isEmail(form.email)) next.email = t.mobile.auth.invalidEmail;
    if (!isStrongPassword(form.password)) next.password = t.mobile.auth.weakPassword;
    if (!accepted) next.terms = t.mobile.auth.mustAcceptTerms;
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setBusy(true);
    const result = await signUp(form).catch(() => ({ ok: false as const, message: undefined }));
    setBusy(false);
    if (result.ok) setSentTo(form.email.trim());
    else setErrors({ form: result.message ?? t.common.error });
  };

  if (sentTo) {
    return (
      <AuthLayout
        title={t.mobile.auth.checkInboxTitle}
        lead={f(t.auth.verifyEmailSent, { email: sentTo })}
      >
        <Button
          testID="sign-up-back-to-sign-in"
          label={t.mobile.auth.backToSignIn}
          variant="outline"
          onPress={() => router.replace(SIGN_IN_ROUTE)}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t.auth.signUpTitle} lead={t.auth.signUpLead}>
      <SignUpFields form={form} set={set} errors={errors} />
      <TermsCheckbox
        checked={accepted}
        invalid={Boolean(errors.terms)}
        onToggle={() => setAccepted((value) => !value)}
      />
      {errors.terms ? (
        <AppText variant="help" tone="destructive">
          {errors.terms}
        </AppText>
      ) : null}
      {errors.form ? (
        <AppText variant="help" tone="destructive" accessibilityLiveRegion="polite">
          {errors.form}
        </AppText>
      ) : null}
      <Button
        testID="sign-up-submit"
        label={t.auth.signUp}
        onPress={() => void submit()}
        loading={busy}
      />
      <TextLink strong label={t.auth.signInTab} onPress={() => router.replace(SIGN_IN_ROUTE)} />
    </AuthLayout>
  );
}

type SignUpForm = Record<"firstName" | "lastName" | "email" | "password", string>;
type SignUpErrors = Partial<Record<keyof SignUpForm | "terms" | "form", string>>;

function SignUpFields({
  form,
  set,
  errors,
}: {
  form: SignUpForm;
  set: (key: keyof SignUpForm) => (value: string) => void;
  errors: SignUpErrors;
}) {
  const { t } = useI18n();
  const lastName = React.useRef<TextFieldHandle>(null);
  const email = React.useRef<TextFieldHandle>(null);
  const password = React.useRef<TextFieldHandle>(null);
  // « Suivant » du clavier passe au champ d'après, que le clavier recouvre dans la feuille.
  const next = (target: React.RefObject<TextFieldHandle | null>) =>
    ({
      returnKeyType: "next",
      submitBehavior: "submit",
      onSubmitEditing: () => target.current?.focus(),
    }) as const;
  return (
    <>
      <View style={styles.row}>
        <View style={styles.flex}>
          <TextField
            testID="sign-up-first-name"
            label={t.auth.firstName}
            value={form.firstName}
            onChangeText={set("firstName")}
            autoComplete="given-name"
            textContentType="givenName"
            error={errors.firstName}
            {...next(lastName)}
          />
        </View>
        <View style={styles.flex}>
          <TextField
            ref={lastName}
            testID="sign-up-last-name"
            label={t.auth.lastName}
            value={form.lastName}
            onChangeText={set("lastName")}
            autoComplete="family-name"
            textContentType="familyName"
            error={errors.lastName}
            {...next(email)}
          />
        </View>
      </View>
      <TextField
        ref={email}
        testID="sign-up-email"
        label={t.auth.email}
        help={t.auth.emailHelp}
        value={form.email}
        onChangeText={set("email")}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        error={errors.email}
        {...next(password)}
      />
      <TextField
        ref={password}
        testID="sign-up-password"
        label={t.auth.password}
        help={t.auth.passwordHelp}
        value={form.password}
        onChangeText={set("password")}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        error={errors.password}
      />
    </>
  );
}

function TermsCheckbox({
  checked,
  invalid,
  onToggle,
}: {
  checked: boolean;
  invalid: boolean;
  onToggle: () => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  return (
    <Pressable
      testID="sign-up-terms"
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={t.auth.acceptTerms}
      onPress={onToggle}
      style={styles.terms}
    >
      <View
        style={[
          styles.box,
          {
            borderColor: invalid ? color.destructive : color.input,
            backgroundColor: checked ? color.primary : color.card,
          },
        ]}
      >
        {checked ? (
          <Icon name="check" color={color.primaryForeground} size={16} strokeWidth={2.5} />
        ) : null}
      </View>
      <AppText variant="small" style={styles.flex}>
        {t.auth.acceptTerms}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: "row", gap: 12 },
  terms: { flexDirection: "row", gap: 12, alignItems: "flex-start", minHeight: 44 },
  box: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
});
