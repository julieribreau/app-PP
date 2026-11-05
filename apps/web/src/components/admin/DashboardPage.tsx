"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { useApi } from "@/providers/ApiProvider";

import { AdminHeading } from "./AdminShell";

function Stat({ label, value, href }: { readonly label: string; readonly value: number | undefined; readonly href: string }) {
  return (
    <Link href={href} className="flex flex-col gap-1 rounded-[18px] border border-border bg-card p-6 hover:border-primary">
      <span className="eyebrow">{label}</span>
      <span className="font-numeric text-[32px] leading-10 font-medium">{value ?? "—"}</span>
    </Link>
  );
}

/** Accueil du back-office : quelques chiffres et les accès aux listes. */
export function DashboardPage() {
  const t = useTranslations("admin");
  const api = useApi();
  const users = useQuery({ queryKey: ["admin", "users", { pageSize: 10 }], queryFn: () => api.admin.users({ pageSize: 10 }) });
  const products = useQuery({ queryKey: ["admin", "products", { pageSize: 1 }], queryFn: () => api.admin.products({ pageSize: 1 }) });
  return (
    <>
      <AdminHeading title={t("dashboard")} />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        <Stat label={t("users")} value={users.data?.counts.total} href="/admin/usagers" />
        <Stat label={t("statuses.unverified")} value={users.data?.counts.unverified} href="/admin/usagers?status=unverified" />
        <Stat label={t("statuses.suspended")} value={users.data?.counts.suspended} href="/admin/usagers?status=suspended" />
        <Stat label={t("products")} value={products.data?.total} href="/admin/produits" />
      </div>
    </>
  );
}
