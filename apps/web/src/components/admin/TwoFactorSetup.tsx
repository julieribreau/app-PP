"use client";

import { QRCodeSVG } from "qrcode.react";
import { useTranslations } from "next-intl";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

function PasswordStep({
  onEnabled,
}: {
  readonly onEnabled: (uri: string, codes: string[]) => void;
}) {
  const t = useTranslations("auth");
  const [error, setError] = React.useState<string | null>(null);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const res = await authClient.twoFactor.enable({
      password: String(new FormData(e.currentTarget).get("password")),
    });
    if (res.error || !res.data || res.data.method !== "totp")
      return setError(t("invalidCredentials"));
    onEnabled(res.data.totpURI, res.data.backupCodes);
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field
        id="tfa-password"
        label={t("password")}
        help={t("twoFactorPasswordHelp")}
        error={error}
      >
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>
      <Button type="submit">{t("twoFactorStart")}</Button>
    </form>
  );
}

/** Le secret base32 de l'URI otpauth://, pour qui ne peut pas scanner le QR code. */
export function totpSecret(uri: string): string {
  try {
    return new URL(uri).searchParams.get("secret") ?? "";
  } catch {
    return "";
  }
}

function VerifyStep({
  uri,
  codes,
  onDone,
}: {
  readonly uri: string;
  readonly codes: string[];
  readonly onDone: () => void;
}) {
  const t = useTranslations("auth");
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await authClient.twoFactor.verifyTotp({ code });
    if (res.error) setError(t("invalidCredentials"));
    else onDone();
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="w-fit rounded-[14px] bg-white p-3">
        <QRCodeSVG value={uri} size={176} title={t("twoFactorQr")} />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium" id="tfa-manual-label">
          {t("twoFactorManualKey")}
        </span>
        <code
          aria-labelledby="tfa-manual-label"
          data-testid="tfa-secret"
          className="font-numeric text-sm break-all select-all"
        >
          {totpSecret(uri)}
        </code>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">{t("twoFactorBackupCodes")}</span>
        <ul className="font-numeric m-0 grid list-none grid-cols-2 gap-1 p-0 text-sm">
          {codes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </div>
      <Field id="tfa-code" label={t("twoFactorCode")} error={error}>
        <Input
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        />
      </Field>
      <Button type="submit" disabled={code.length !== 6}>
        {t("twoFactorVerify")}
      </Button>
    </form>
  );
}

/** Activation obligatoire de la 2FA avant le back-office : mot de passe, QR code, codes de secours, vérification. */
export function TwoFactorSetup({ onDone }: { readonly onDone: () => void }) {
  const t = useTranslations("auth");
  const [setup, setSetup] = React.useState<{ uri: string; codes: string[] } | null>(null);
  return (
    <main className="mx-auto flex max-w-[460px] flex-col gap-6 px-6 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="display m-0 text-4xl leading-10">{t("twoFactorSetupTitle")}</h1>
        <p className="text-muted-foreground m-0">{t("twoFactorSetupLead")}</p>
      </div>
      {setup ? (
        <VerifyStep uri={setup.uri} codes={setup.codes} onDone={onDone} />
      ) : (
        <PasswordStep onEnabled={(uri, codes) => setSetup({ uri, codes })} />
      )}
    </main>
  );
}
