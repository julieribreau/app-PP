"use client";

import { useTranslations } from "next-intl";
import * as React from "react";

import { Avatar } from "@/components/account/Avatar";
import { Badge } from "@/components/ui/badge";
import type { AdminUser } from "@/lib/api/types";
import { formatDate, formatDateTime, formatPrice } from "@/lib/format";

import type { DataColumn } from "./DataTable";
import { UserActions } from "./UserActions";

const STATUS_TONE = { active: "success", suspended: "danger", unverified: "muted" } as const;

/** Colonnes du tableau des usagers (stables tant que la langue ne change pas). */
export function useUserColumns(locale: string): DataColumn<AdminUser>[] {
  const t = useTranslations("admin");
  return React.useMemo(
    () => [
      {
        id: "user",
        header: t("col.user"),
        sortKey: "name",
        cell: (u) => (
          <div className="flex items-center gap-2.5">
            <Avatar profile={{ ...u, imageUrl: null }} size={32} />
            <div className="flex flex-col"><span className="font-medium">{u.name}</span><span className="text-[13px] text-muted-foreground">{u.email}</span></div>
          </div>
        ),
      },
      { id: "role", header: t("col.role"), cell: (u) => <Badge tone={u.role === "admin" ? "strong" : "soft"}>{t(`roles.${u.role}`)}</Badge> },
      { id: "status", header: t("col.status"), cell: (u) => <Badge tone={STATUS_TONE[u.status]}>{t(`statuses.${u.status}`)}</Badge> },
      { id: "email", header: t("col.email"), cell: (u) => (u.emailVerified ? t("verified") : t("notVerified")) },
      { id: "createdAt", header: t("col.createdAt"), sortKey: "createdAt", className: "font-numeric text-[13px]", cell: (u) => formatDate(u.createdAt, locale) },
      { id: "lastLoginAt", header: t("col.lastLogin"), sortKey: "lastLoginAt", className: "font-numeric text-[13px]", cell: (u) => (u.lastLoginAt ? formatDateTime(u.lastLoginAt, locale) : t("never")) },
      { id: "cart", header: t("col.cart"), align: "right", className: "font-numeric text-[13px]", cell: (u) => (u.cartTotalCents ? formatPrice(u.cartTotalCents, locale) : "—") },
      { id: "actions", header: <span className="sr-only">{t("col.actions")}</span>, align: "right", cell: (u) => <UserActions user={u} /> },
    ],
    [t, locale],
  );
}
