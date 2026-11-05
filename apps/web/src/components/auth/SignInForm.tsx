"use client";

import { useTranslations } from "next-intl";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";

import { authErrorKey } from "./authErrors";
import { TotpChallenge } from "./TotpChallenge";
import { useAfterSignIn } from "./useAfterSignIn";

/** Connexion e-mail + mot de passe ; un compte avec 2FA passe par le défi TOTP. */
export function SignInForm() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const afterSignIn = useAfterSignIn();
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [needTotp, setNeedTotp] = React.useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    const res = await authClient.signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    setPending(false);
    if (res.error) {
      const key = authErrorKey(res.error);
      setError(key === "error" ? tc("error") : t(key));
      return;
    }
    if (res.data && "twoFactorRedirect" in res.data && res.data.twoFactorRedirect)
      setNeedTotp(true);
    else await afterSignIn();
  };

  if (needTotp) return <TotpChallenge onDone={afterSignIn} />;
  return (
    <form onSubmit={submit} className="flex flex-col gap-[18px]" noValidate>
      <div className="flex flex-col gap-2">
        <h1 className="display m-0 text-4xl leading-10">{t("welcomeBack")}</h1>
        <p className="text-muted-foreground m-0">{t("signInLead")}</p>
      </div>
      <Field id="signin-email" label={t("email")}>
        <Input name="email" type="email" autoComplete="email" required />
      </Field>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between">
          <label htmlFor="signin-password" className="text-sm font-medium">
            {t("password")}
          </label>
          <Link href="/mot-de-passe-oublie" className="text-muted-foreground text-sm underline">
            {t("forgot")}
          </Link>
        </div>
        <Input
          id="signin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-describedby={error ? "signin-error" : undefined}
        />
      </div>
      <div role="alert" id="signin-error" className="text-destructive text-sm empty:hidden">
        {error}
      </div>
      <Button type="submit" size="lg" disabled={pending}>
        {t("signIn")}
      </Button>
      <p className="text-muted-foreground m-0 text-center text-sm">{t("mergeNote")}</p>
    </form>
  );
}
