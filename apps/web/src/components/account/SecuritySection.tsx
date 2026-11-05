"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useSession } from "@/hooks/useSession";
import { authClient, isStrongPassword } from "@/lib/auth-client";
import { formatDateTime } from "@/lib/format";

function deviceName(userAgent: string | null | undefined): string {
  if (!userAgent) return "—";
  const os = /iPhone|iPad|Android|Mac OS|Windows|Linux/.exec(userAgent)?.[0] ?? "";
  const browser = /Firefox|Edg|Chrome|Safari|Expo|okhttp/.exec(userAgent)?.[0] ?? "";
  return [os, browser].filter(Boolean).join(" · ") || userAgent.slice(0, 40);
}

function PasswordDialog({ open, onOpenChange }: { readonly open: boolean; readonly onOpenChange: (o: boolean) => void }) {
  const t = useTranslations();
  const [error, setError] = React.useState<string | null>(null);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const newPassword = String(form.get("new"));
    if (!isStrongPassword(newPassword)) return setError(t("auth.passwordHelp"));
    const res = await authClient.changePassword({ currentPassword: String(form.get("current")), newPassword, revokeOtherSessions: true });
    if (res.error) return setError(t("auth.invalidCredentials"));
    toast.success(t("common.saved"));
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={t("account.changePassword")}>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <Field id="pw-current" label={t("account.currentPassword")}><Input name="current" type="password" autoComplete="current-password" required /></Field>
          <Field id="pw-new" label={t("auth.newPassword")} help={t("auth.passwordHelp")} error={error}><Input name="new" type="password" autoComplete="new-password" required /></Field>
          <div className="flex justify-end"><Button type="submit">{t("common.save")}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Mot de passe et sessions ouvertes sur les autres appareils (déconnexion à distance). */
export function SecuritySection() {
  const t = useTranslations("account");
  const ta = useTranslations("auth");
  const locale = useLocale();
  const client = useQueryClient();
  const { session } = useSession();
  const [open, setOpen] = React.useState(false);
  const sessions = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => (await authClient.listSessions()).data ?? [],
  });
  const revoke = async (token: string) => {
    await authClient.revokeSession({ token });
    void client.invalidateQueries({ queryKey: ["sessions"] });
  };
  return (
    <section id="securite" aria-labelledby="sec-title" className="flex flex-col gap-3.5 rounded-[24px] border border-border bg-card p-7">
      <SectionTitle id="sec-title">{t("security")}</SectionTitle>
      <div className="flex items-center justify-between gap-3">
        <strong className="font-medium">{ta("password")}</strong>
        <Button variant="outline" onClick={() => setOpen(true)}>{t("changePassword")}</Button>
      </div>
      <h3 className="m-0 border-t border-border pt-3.5 text-sm font-medium">{t("devices")}</h3>
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {(sessions.data ?? []).map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-3">
            <span>
              {deviceName(s.userAgent)} <span className="text-sm text-muted-foreground">{formatDateTime(String(s.updatedAt), locale)}</span>
            </span>
            {s.token === session?.session.token ? (
              <span className="text-sm text-muted-foreground">{t("thisSession")}</span>
            ) : (
              <button type="button" className="cursor-pointer text-sm underline" onClick={() => void revoke(s.token)}>{t("revoke")}</button>
            )}
          </li>
        ))}
      </ul>
      <PasswordDialog open={open} onOpenChange={setOpen} />
    </section>
  );
}
