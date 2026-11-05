"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ME_KEY, useUpdateMe } from "@/hooks/useMe";
import type { Profile } from "@/lib/api/types";
import { authClient } from "@/lib/auth-client";
import { useApi } from "@/providers/ApiProvider";

import { Avatar } from "./Avatar";

function AvatarControls({ profile }: { readonly profile: Profile }) {
  const t = useTranslations("account");
  const api = useApi();
  const client = useQueryClient();
  const input = React.useRef<HTMLInputElement>(null);
  const refresh = () => client.invalidateQueries({ queryKey: ME_KEY });
  const onFile = async (file: File | undefined) => {
    if (!file) return;
    await api.account.uploadAvatar(file).then(refresh, () => toast.error(t("avatarError")));
  };
  return (
    <div className="flex items-center gap-3">
      <Avatar profile={profile} size={56} />
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => void onFile(e.target.files?.[0])} />
      <Button variant="outline" onClick={() => input.current?.click()}>{t("changePhoto")}</Button>
      {profile.imageUrl ? <Button variant="ghost" onClick={() => void api.account.removeAvatar().then(refresh)}>{t("removePhoto")}</Button> : null}
    </div>
  );
}

/** Profil : identité, téléphone, photo ; un changement d'e-mail passe par une nouvelle confirmation. */
export function ProfileSection({ profile }: { readonly profile: Profile }) {
  const t = useTranslations("account");
  const ta = useTranslations("auth");
  const tc = useTranslations("common");
  const locale = useLocale();
  const update = useUpdateMe();
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const get = (k: string) => String(form.get(k) ?? "").trim();
    update.mutate({ firstName: get("firstName"), lastName: get("lastName"), phone: get("phone") || null });
    const email = get("email");
    if (email && email !== profile.email) {
      const res = await authClient.changeEmail({ newEmail: email, callbackURL: `${window.location.origin}/${locale}/compte` });
      if (res.error) toast.error(tc("error"));
      else toast.success(ta("verifyEmailSent", { email }));
    }
  };
  return (
    <section id="profil" aria-labelledby="profil-title" className="flex flex-col gap-5 rounded-[24px] border border-border bg-card p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <SectionTitle id="profil-title">{t("profile")}</SectionTitle>
        <AvatarControls profile={profile} />
      </div>
      <form onSubmit={submit} className="flex flex-col gap-5">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-4">
          <Field id="p-first" label={ta("firstName")}><Input name="firstName" defaultValue={profile.firstName ?? ""} autoComplete="given-name" /></Field>
          <Field id="p-last" label={ta("lastName")}><Input name="lastName" defaultValue={profile.lastName ?? ""} autoComplete="family-name" /></Field>
          <Field id="p-email" label={ta("email")} help={t("emailChangeHelp")}><Input name="email" type="email" defaultValue={profile.email} autoComplete="email" /></Field>
          <Field id="p-phone" label={t("phone")}><Input name="phone" type="tel" defaultValue={profile.phone ?? ""} autoComplete="tel" /></Field>
        </div>
        <div className="flex justify-end"><Button type="submit" disabled={update.isPending}>{tc("save")}</Button></div>
      </form>
    </section>
  );
}
