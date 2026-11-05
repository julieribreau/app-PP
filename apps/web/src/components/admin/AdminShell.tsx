"use client";

import { Bell, LayoutDashboard, ListChecks, Package, Tag, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";

import { LocaleSwitch } from "@/components/layout/LocaleSwitch";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/hooks/useSession";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/admin", key: "dashboard", icon: LayoutDashboard },
  { href: "/admin/usagers", key: "users", icon: Users },
  { href: "/admin/produits", key: "products", icon: Package },
  { href: "/admin/categories", key: "categories", icon: Tag },
  { href: "/admin/journal", key: "audit", icon: ListChecks },
] as const;

function isCurrent(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

function Sidebar() {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const pathname = usePathname();
  const { user } = useSession();
  return (
    <aside className="flex max-w-[260px] flex-[1_1_240px] flex-col gap-6 border-r border-border bg-card px-4 py-5">
      <div className="flex flex-col gap-0.5 px-3">
        <Link href="/" className="display text-[22px] leading-7 hover:text-primary">{tc("appName")}</Link>
        <span className="text-[13px] leading-[18px] text-muted-foreground">{t("title")}</span>
      </div>
      <nav aria-label={t("title")} className="flex flex-col gap-0.5">
        {NAV.map(({ href, key, icon: Icon }) => {
          const current = isCurrent(pathname, href);
          return (
            <Link key={href} href={href} aria-current={current ? "page" : undefined} className={cn("flex h-10 items-center gap-3 rounded-[12px] px-3 font-medium hover:bg-muted", current && "bg-secondary text-secondary-foreground hover:bg-secondary")}>
              <Icon aria-hidden="true" className="size-[18px]" strokeWidth={1.75} />
              {t(key)}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto flex items-center gap-2.5 border-t border-border p-3">
        <div className="flex min-w-0 flex-col">
          <strong className="truncate text-sm">{user?.name}</strong>
          <span className="text-[13px] leading-[18px] text-muted-foreground">{t("twoFactorActive")}</span>
        </div>
      </div>
    </aside>
  );
}

function TopBar() {
  const t = useTranslations("admin");
  const router = useRouter();
  const [q, setQ] = React.useState("");
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-8 py-3">
      <form role="search" className="max-w-[420px] flex-[1_1_280px]" onSubmit={(e) => { e.preventDefault(); router.push(`/admin/usagers?q=${encodeURIComponent(q)}`); }}>
        <label htmlFor="admin-search" className="sr-only">{t("globalSearch")}</label>
        <Input id="admin-search" type="search" className="h-10" placeholder={t("globalSearch")} value={q} onChange={(e) => setQ(e.target.value)} />
      </form>
      <div className="flex items-center gap-1">
        <React.Suspense fallback={null}><LocaleSwitch /><ThemeToggle /></React.Suspense>
        <Button variant="ghost" size="iconSm" aria-label={t("notifications", { count: 0 })}>
          <Bell aria-hidden="true" strokeWidth={1.75} />
        </Button>
      </div>
    </header>
  );
}

/** Coque du back-office : menu latéral, barre de recherche, contenu. */
export function AdminShell({ children }: { readonly children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-wrap">
      <Sidebar />
      <div className="flex min-w-0 flex-[999_1_640px] flex-col">
        <TopBar />
        <main className="flex flex-col gap-5 px-8 pt-7 pb-10">{children}</main>
      </div>
    </div>
  );
}

/** Titre de page du back-office, avec ses actions à droite. */
export function AdminHeading({ title, sub, actions }: { readonly title: React.ReactNode; readonly sub?: React.ReactNode; readonly actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="display m-0 text-[34px] leading-10">{title}</h1>
        {sub ? <span className="text-sm text-muted-foreground">{sub}</span> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
