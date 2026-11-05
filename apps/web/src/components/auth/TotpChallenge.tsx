"use client";

import { useTranslations } from "next-intl";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

/** Défi du second facteur (code TOTP à 6 chiffres) après le mot de passe. */
export function TotpChallenge({ onDone }: { readonly onDone: () => void | Promise<void> }) {
  const t = useTranslations("auth");
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    const res = await authClient.twoFactor.verifyTotp({ code, trustDevice: false });
    setPending(false);
    if (res.error) setError(t("invalidCredentials"));
    else await onDone();
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-[18px]" noValidate>
      <div className="flex flex-col gap-2">
        <h1 className="display m-0 text-4xl leading-10">{t("twoFactorTitle")}</h1>
        <p className="m-0 text-muted-foreground">{t("twoFactorLead")}</p>
      </div>
      <Field id="totp" label={t("twoFactorCode")} error={error}>
        <Input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} autoFocus />
      </Field>
      <Button type="submit" size="lg" disabled={pending || code.length !== 6}>{t("twoFactorVerify")}</Button>
    </form>
  );
}
