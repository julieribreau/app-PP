"use client";

import { useTranslations } from "next-intl";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

type Mode = "totp" | "backup";

function verify(mode: Mode, code: string) {
  return mode === "totp"
    ? authClient.twoFactor.verifyTotp({ code, trustDevice: false })
    : authClient.twoFactor.verifyBackupCode({ code, trustDevice: false });
}

/** Défi du second facteur après le mot de passe : code TOTP à 6 chiffres, ou code de secours. */
export function TotpChallenge({ onDone }: { readonly onDone: () => void | Promise<void> }) {
  const t = useTranslations("auth");
  const [mode, setMode] = React.useState<Mode>("totp");
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const totp = mode === "totp";
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    const res = await verify(mode, code.trim());
    setPending(false);
    if (res.error) setError(t("invalidCode"));
    else await onDone();
  };
  const switchMode = () => {
    setMode(totp ? "backup" : "totp");
    setCode("");
    setError(null);
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-[18px]" noValidate>
      <div className="flex flex-col gap-2">
        <h1 className="display m-0 text-4xl leading-10">{t("twoFactorTitle")}</h1>
        <p className="text-muted-foreground m-0">
          {totp ? t("twoFactorLead") : t("backupCodeLead")}
        </p>
      </div>
      <Field id="totp" label={totp ? t("twoFactorCode") : t("backupCode")} error={error}>
        <Input
          key={mode}
          inputMode={totp ? "numeric" : "text"}
          autoComplete="one-time-code"
          pattern={totp ? "[0-9]*" : undefined}
          maxLength={totp ? 6 : 32}
          value={code}
          onChange={(e) => setCode(totp ? e.target.value.replace(/\D/g, "") : e.target.value)}
          autoFocus
        />
      </Field>
      <Button
        type="submit"
        size="lg"
        disabled={pending || (totp ? code.length !== 6 : code.trim().length < 6)}
      >
        {t("twoFactorVerify")}
      </Button>
      <Button type="button" variant="link" onClick={switchMode} className="self-center">
        {totp ? t("useBackupCode") : t("useTotpCode")}
      </Button>
    </form>
  );
}
