"use client";

import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

import { HeaderActions } from "./HeaderActions";

function section(pathname: string): string {
  if (pathname.startsWith("/boutique")) return "shop";
  if (pathname.startsWith("/panier")) return "cart";
  if (pathname.startsWith("/compte")) return "account";
  return pathname === "/" ? "home" : "";
}

/** En-tête du site public : marque, navigation principale, langue, thème, compte, panier. */
export function SiteHeader() {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const current = section(usePathname());
  const links = [
    { href: "/", key: "home", label: t("home") },
    { href: "/boutique", key: "shop", label: t("shop") },
    { href: "/#approche", key: "approach", label: t("approach") },
  ] as const;
  return (
    <header className="flex flex-wrap items-center justify-between gap-6 border-b border-border px-6 py-4 md:px-12">
      <Link href="/" className="display text-[26px] leading-8 hover:text-primary">
        {tc("appName")}
      </Link>
      <nav aria-label={t("main")} className="flex flex-wrap gap-8 font-medium">
        {links.map((link) => (
          <Link
            key={link.key}
            href={link.href}
            aria-current={current === link.key ? "page" : undefined}
            className={cn("hover:text-primary", current === link.key && "text-primary")}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <HeaderActions current={current} />
    </header>
  );
}
