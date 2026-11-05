"use client";

import { useLocale, useTranslations } from "next-intl";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { authClient, isStrongPassword } from "@/lib/auth-client";

type Errors = Partial<Record<"password" | "terms" | "form", string>>;

function validate(form: FormData, t: (k: string) => string): Errors {
  const errors: Errors = {};
  if (!isStrongPassword(String(form.get("password")))) errors.password = t("passwordHelp");
  if (!form.get("terms")) errors.terms = t("termsRequired");
  return errors;
}

/** Création de compte ; l'e-mail doit être confirmé avant la première connexion. */
export function SignUpForm() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [errors, setErrors] = React.useState<Errors>({});
  const [sentTo, setSentTo] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const found = validate(form, t);
    setErrors(found);
    if (Object.keys(found).length) return;
    const [firstName, lastName, email] = ["firstName", "lastName", "email"].map((k) =>
      String(form.get(k)).trim(),
    );
    setPending(true);
    const res = await authClient.signUp.email({
      email: email ?? "",
      password: String(form.get("password")),
      name: `${firstName} ${lastName}`.trim(),
      firstName,
      lastName,
      locale,
      callbackURL: `${window.location.origin}/${locale}/verifier-email?ok=1`,
    });
    setPending(false);
    if (res.error) setErrors({ form: res.error.message ?? tc("error") });
    else setSentTo(email ?? "");
  };

  if (sentTo) {
    return (
      <div
        role="status"
        className="border-border bg-card flex flex-col gap-4 rounded-[24px] border p-6"
      >
        <h1 className="display m-0 text-3xl">{t("signUpTitle")}</h1>
        <p className="m-0">{t("verifyEmailSent", { email: sentTo })}</p>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-[18px]" noValidate>
      <div className="flex flex-col gap-2">
        <h1 className="display m-0 text-4xl leading-10">{t("signUpTitle")}</h1>
        <p className="text-muted-foreground m-0">{t("signUpLead")}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field id="su-first" label={t("firstName")}>
          <Input name="firstName" autoComplete="given-name" required />
        </Field>
        <Field id="su-last" label={t("lastName")}>
          <Input name="lastName" autoComplete="family-name" required />
        </Field>
      </div>
      <Field id="su-email" label={t("email")} help={t("emailHelp")}>
        <Input name="email" type="email" autoComplete="email" required />
      </Field>
      <Field
        id="su-password"
        label={t("password")}
        help={errors.password ? undefined : t("passwordHelp")}
        error={errors.password}
      >
        <Input name="password" type="password" autoComplete="new-password" required />
      </Field>
      <div className="flex flex-col gap-1">
        <label className="flex items-start gap-2.5 text-sm leading-5">
          <input
            type="checkbox"
            name="terms"
            className="mt-0 size-5 shrink-0 accent-[var(--primary)]"
            aria-invalid={errors.terms ? true : undefined}
            aria-describedby={errors.terms ? "su-terms-error" : undefined}
          />
          <span>
            {t.rich("acceptTermsRich", {
              terms: (chunks) => (
                <Link href="/cgu" className="underline">
                  {chunks}
                </Link>
              ),
              privacy: (chunks) => (
                <Link href="/confidentialite" className="underline">
                  {chunks}
                </Link>
              ),
            })}
          </span>
        </label>
        {errors.terms ? (
          <span id="su-terms-error" className="text-destructive text-sm">
            {errors.terms}
          </span>
        ) : null}
      </div>
      <div role="alert" className="text-destructive text-sm empty:hidden">
        {errors.form}
      </div>
      <Button type="submit" size="lg" disabled={pending}>
        {t("signUp")}
      </Button>
    </form>
  );
}
