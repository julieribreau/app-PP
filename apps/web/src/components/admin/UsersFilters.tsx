"use client";

import { useTranslations } from "next-intl";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";

type Values = Record<"q" | "role" | "status", string>;

/** Recherche (après une pause de frappe), rôle et statut. */
export function UsersFilters({ values, onChange }: { readonly values: Values; readonly onChange: (patch: Partial<Values>) => void }) {
  const t = useTranslations("admin");
  const [q, setQ] = React.useState(values.q);
  React.useEffect(() => setQ(values.q), [values.q]);
  React.useEffect(() => {
    if (q === values.q) return;
    const id = setTimeout(() => onChange({ q }), 300);
    return () => clearTimeout(id);
  }, [q, values.q, onChange]);
  return (
    <div role="search" className="flex flex-wrap items-center gap-2.5">
      <label htmlFor="users-q" className="sr-only">{t("searchUsers")}</label>
      <Input id="users-q" type="search" className="h-10 w-[260px]" placeholder={t("searchUsers")} value={q} onChange={(e) => setQ(e.target.value)} />
      <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {t("role")}
        <Select className="h-10 w-auto" value={values.role} onChange={(e) => onChange({ role: e.target.value })}>
          <option value="">{t("all")}</option>
          <option value="user">{t("roles.user")}</option>
          <option value="admin">{t("roles.admin")}</option>
        </Select>
      </label>
      <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {t("status")}
        <Select className="h-10 w-auto" value={values.status} onChange={(e) => onChange({ status: e.target.value })}>
          <option value="">{t("all")}</option>
          <option value="active">{t("statuses.active")}</option>
          <option value="suspended">{t("statuses.suspended")}</option>
          <option value="unverified">{t("statuses.unverified")}</option>
        </Select>
      </label>
      <Button variant="ghost" size="sm" className="text-primary" onClick={() => onChange({ q: "", role: "", status: "" })}>{t("reset")}</Button>
    </div>
  );
}
