"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { authClient, isStrongPassword } from "@/lib/auth-client";

function Title({ title, lead }: { readonly title: string; readonly lead?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="display m-0 text-4xl leading-10">{title}</h1>
      {lead ? <p className="text-muted-foreground m-0">{lead}</p> : null}
    </div>
  );
}

/** Demande de lien de réinitialisation ; la réponse ne dit pas si le compte existe. */
export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [sent, setSent] = React.useState(false);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email"));
    await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/${locale}/reinitialiser-mot-de-passe`,
    });
    setSent(true);
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-[18px]">
      <Title title={t("resetTitle")} lead={t("resetLead")} />
      <Field id="forgot-email" label={t("email")}>
        <Input name="email" type="email" autoComplete="email" required />
      </Field>
      <div role="status" className="empty:hidden">
        {sent ? t("resetSent") : null}
      </div>
      <Button type="submit" size="lg" disabled={sent}>
        {t("resetSend")}
      </Button>
      <Link href="/connexion" className="text-center text-sm underline">
        {t("backToSignIn")}
      </Link>
    </form>
  );
}

/** Nouveau mot de passe à partir du jeton reçu par e-mail. */
export function ResetPasswordForm() {
  const t = useTranslations("auth");
  const token = useSearchParams().get("token");
  const [state, setState] = React.useState<"idle" | "done" | "error" | "weak">(
    token ? "idle" : "error",
  );
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newPassword = String(new FormData(e.currentTarget).get("password"));
    if (!isStrongPassword(newPassword)) return setState("weak");
    const res = await authClient.resetPassword({ newPassword, token: token ?? "" });
    setState(res.error ? "error" : "done");
  };
  if (state === "done") {
    return (
      <div role="status" className="flex flex-col gap-4">
        <Title title={t("resetTitle")} lead={t("resetDone")} />
        <Button asChild size="lg">
          <Link href="/connexion">{t("signIn")}</Link>
        </Button>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-[18px]" noValidate>
      <Title title={t("resetTitle")} />
      <Field
        id="reset-password"
        label={t("newPassword")}
        help={state === "weak" ? undefined : t("passwordHelp")}
        error={state === "weak" ? t("passwordHelp") : undefined}
      >
        <Input name="password" type="password" autoComplete="new-password" required />
      </Field>
      <div role="alert" className="text-destructive text-sm empty:hidden">
        {state === "error" ? t("resetInvalid") : null}
      </div>
      <Button type="submit" size="lg" disabled={!token}>
        {t("resetTitle")}
      </Button>
    </form>
  );
}

/** Retour du lien de confirmation d'adresse (le backend redirige ici avec ?ok=1 ou ?error=…). */
export function VerifyEmailResult() {
  const t = useTranslations("auth");
  const search = useSearchParams();
  const token = search.get("token");
  const [ok, setOk] = React.useState<boolean | null>(token ? null : !search.get("error"));
  React.useEffect(() => {
    if (!token) return;
    void authClient.verifyEmail({ query: { token } }).then((res) => setOk(!res.error));
  }, [token]);
  if (ok === null) return <p role="status">{t("verifying")}</p>;
  return (
    <div role="status" className="flex flex-col gap-4">
      <Title title={ok ? t("verifyEmailDone") : t("verifyEmailError")} />
      <Button asChild size="lg">
        <Link href="/connexion">{t("signIn")}</Link>
      </Button>
    </div>
  );
}
