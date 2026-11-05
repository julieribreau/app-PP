"use client";

import { useTranslations } from "next-intl";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/spinner";
import { useSession } from "@/hooks/useSession";
import { Link, useRouter } from "@/i18n/navigation";

import { TwoFactorSetup } from "./TwoFactorSetup";

export type AdminAccess = "loading" | "anonymous" | "forbidden" | "needs-2fa" | "granted";

/** Accès au back-office : connecté, rôle admin, double authentification activée. */
export function adminAccess(
  isPending: boolean,
  user: { role?: string | null; twoFactorEnabled?: boolean | null } | null,
): AdminAccess {
  if (isPending) return "loading";
  if (!user) return "anonymous";
  if (user.role !== "admin") return "forbidden";
  return user.twoFactorEnabled ? "granted" : "needs-2fa";
}

export function AdminGuard({ children }: { readonly children: React.ReactNode }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const { user, isPending, refetch } = useSession();
  const access = adminAccess(isPending, user);
  React.useEffect(() => {
    if (access === "anonymous") router.replace("/connexion?next=/admin");
  }, [access, router]);
  if (access === "loading" || access === "anonymous") return <Loading />;
  if (access === "forbidden") {
    return (
      <main className="mx-auto flex max-w-[460px] flex-col items-start gap-4 px-6 py-16">
        <h1 className="display m-0 text-4xl">{t("forbidden")}</h1>
        <Button asChild variant="outline"><Link href="/">{t("backToSite")}</Link></Button>
      </main>
    );
  }
  if (access === "needs-2fa") return <TwoFactorSetup onDone={() => void refetch()} />;
  return <>{children}</>;
}
