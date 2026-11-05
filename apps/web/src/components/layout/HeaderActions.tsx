"use client";

import { ShoppingBag, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";
import { useSession } from "@/hooks/useSession";
import { Link } from "@/i18n/navigation";

import { LocaleSwitch } from "./LocaleSwitch";
import { ThemeToggle } from "./ThemeToggle";

function CartLink({ current }: { readonly current: boolean }) {
  const t = useTranslations("nav");
  const { data } = useCart();
  const count = data?.itemCount ?? 0;
  return (
    <Button asChild variant="ghost" size="icon" className="relative">
      <Link
        href="/panier"
        aria-label={t("cartCount", { count })}
        aria-current={current ? "page" : undefined}
      >
        <ShoppingBag
          aria-hidden="true"
          strokeWidth={1.75}
          className={current ? "text-primary" : undefined}
        />
        {count > 0 ? (
          <span
            aria-hidden="true"
            className="bg-primary text-primary-foreground absolute top-1 right-0.5 h-[18px] min-w-[18px] rounded-full px-1 text-center text-[11px] leading-[18px] font-semibold"
          >
            {count}
          </span>
        ) : null}
      </Link>
    </Button>
  );
}

/** Langue, thème, compte et panier : la barre d'outils à droite de l'en-tête. */
export function HeaderActions({ current }: { readonly current?: string }) {
  const t = useTranslations("nav");
  const { user } = useSession();
  return (
    <div className="flex items-center gap-1">
      <React.Suspense fallback={null}>
        <LocaleSwitch />
        <ThemeToggle />
      </React.Suspense>
      <Button asChild variant="ghost" size="icon">
        <Link
          href={user ? "/compte" : "/connexion"}
          aria-label={user ? t("account") : t("signIn")}
          aria-current={current === "account" ? "page" : undefined}
        >
          <UserRound
            aria-hidden="true"
            strokeWidth={1.75}
            className={current === "account" ? "text-primary" : undefined}
          />
        </Link>
      </Button>
      <CartLink current={current === "cart"} />
    </div>
  );
}
