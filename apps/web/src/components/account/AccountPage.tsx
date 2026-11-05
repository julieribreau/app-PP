"use client";

import { useLocale, useTranslations } from "next-intl";
import * as React from "react";

import { ErrorNote, Loading } from "@/components/ui/spinner";
import { useMe } from "@/hooks/useMe";
import { useSession } from "@/hooks/useSession";
import { useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { formatDate } from "@/lib/format";

import { AddressesSection } from "./AddressesSection";
import { Avatar } from "./Avatar";
import { DataSection } from "./DataSection";
import { PreferencesSection } from "./PreferencesSection";
import { ProfileSection } from "./ProfileSection";
import { SecuritySection } from "./SecuritySection";

const SECTIONS = [
  ["profil", "profile"],
  ["adresses", "addresses"],
  ["securite", "security"],
  ["preferences", "preferences"],
  ["donnees", "data"],
] as const;

function AccountNav({
  name,
  since,
  avatar,
}: {
  readonly name: string;
  readonly since: string;
  readonly avatar: React.ReactNode;
}) {
  const t = useTranslations("account");
  const ta = useTranslations("auth");
  const router = useRouter();
  const signOut = async () => {
    await authClient.signOut();
    router.replace("/");
    router.refresh();
  };
  return (
    <nav aria-label={t("nav")} className="flex flex-[1_1_240px] flex-col gap-1">
      <div className="flex items-center gap-3 px-3.5 pb-5">
        {avatar}
        <div className="flex flex-col">
          <strong>{name}</strong>
          <span className="text-muted-foreground text-sm">{t("memberSince", { date: since })}</span>
        </div>
      </div>
      {SECTIONS.map(([id, key]) => (
        <a
          key={id}
          href={`#${id}`}
          className="hover:bg-muted flex h-11 items-center rounded-[14px] px-3.5 font-medium"
        >
          {t(key)}
        </a>
      ))}
      <button
        type="button"
        onClick={() => void signOut()}
        className="text-muted-foreground hover:bg-muted flex h-11 cursor-pointer items-center rounded-[14px] px-3.5 text-left font-medium"
      >
        {ta("signOut")}
      </button>
    </nav>
  );
}

/** Espace personnel : réservé aux connectés, chaque section gère une partie des données. */
export function AccountPage() {
  const t = useTranslations("account");
  const locale = useLocale();
  const router = useRouter();
  const { user, isPending } = useSession();
  const me = useMe(Boolean(user));
  React.useEffect(() => {
    if (!isPending && !user) router.replace("/connexion?next=/compte");
  }, [isPending, user, router]);
  if (isPending || !user || me.isPending) return <Loading />;
  if (me.isError) return <ErrorNote onRetry={() => void me.refetch()} />;
  const profile = me.data;
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.email;
  return (
    <main className="mx-auto flex max-w-[1280px] flex-wrap items-start gap-10 px-6 pt-10 pb-20 md:px-12">
      <AccountNav
        name={name}
        since={formatDate(profile.createdAt, locale)}
        avatar={<Avatar profile={profile} />}
      />
      <div className="flex min-w-0 flex-[999_1_640px] flex-col gap-6">
        <h1 className="display m-0 text-[44px] leading-[48px]">{t("title")}</h1>
        <ProfileSection profile={profile} />
        <AddressesSection />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-6">
          <PreferencesSection />
          <SecuritySection />
        </div>
        <DataSection />
      </div>
    </main>
  );
}
