"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import { Pagination } from "@/components/shop/Pagination";
import { Button } from "@/components/ui/button";
import { ErrorNote, Loading } from "@/components/ui/spinner";
import { useUrlState } from "@/hooks/useUrlState";
import { saveBlob } from "@/lib/api/http";
import type { AdminUsersQuery } from "@/lib/api/types";
import { useApi } from "@/providers/ApiProvider";

import { AdminHeading } from "./AdminShell";
import { DataTable, type SortState } from "./DataTable";
import { UsersFilters } from "./UsersFilters";
import { useUserColumns } from "./userColumns";

const KEYS = ["q", "role", "status", "sort", "order", "page", "pageSize"] as const;

function toQuery(s: Record<(typeof KEYS)[number], string>): AdminUsersQuery {
  return {
    q: s.q || undefined,
    role: (s.role || undefined) as AdminUsersQuery["role"],
    status: (s.status || undefined) as AdminUsersQuery["status"],
    sort: (s.sort || "createdAt") as AdminUsersQuery["sort"],
    order: (s.order || "desc") as AdminUsersQuery["order"],
    page: Math.max(1, Number(s.page) || 1),
    pageSize: [10, 25, 50].includes(Number(s.pageSize)) ? Number(s.pageSize) : 10,
  };
}

/** Usagers : recherche, filtres, tri, pagination côté serveur, export CSV, actions par ligne. */
export function UsersPage() {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const locale = useLocale();
  const api = useApi();
  const [state, set] = useUrlState(KEYS);
  const query = toQuery(state);
  const { data, isPending, isError, refetch } = useQuery({ queryKey: ["admin", "users", query], queryFn: () => api.admin.users(query), placeholderData: keepPreviousData });
  const columns = useUserColumns(locale);
  const sort: SortState = { key: query.sort ?? "createdAt", order: query.order ?? "desc" };
  const onSort = (key: string) => set({ sort: key, order: sort.key === key && sort.order === "desc" ? "asc" : "desc" });
  const exportCsv = async () => {
    try {
      saveBlob(await api.admin.exportUsers(query), "usagers.csv");
    } catch {
      toast.error(tc("error"));
    }
  };
  const from = data ? (data.page - 1) * data.pageSize + 1 : 0;
  return (
    <>
      <AdminHeading
        title={t("users")}
        sub={data ? t("usersSummary", data.counts) : undefined}
        actions={<Button variant="outline" size="sm" onClick={() => void exportCsv()}><Download aria-hidden="true" strokeWidth={1.75} />{t("export")}</Button>}
      />
      <UsersFilters values={state} onChange={set} />
      {isPending ? <Loading /> : isError ? <ErrorNote onRetry={() => void refetch()} /> : (
        <DataTable rows={data.items} columns={columns} getRowId={(u) => u.id} caption={t("users")} sort={sort} onSort={onSort} />
      )}
      {data ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">{t("range", { from: data.total ? from : 0, to: Math.min(from + data.items.length - 1, data.total), total: data.total })}</span>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
              {t("rows")}
              <select className="h-10 rounded-[12px] border border-input bg-card px-2 text-foreground" value={query.pageSize} onChange={(e) => set({ pageSize: e.target.value })}>
                {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <Pagination page={data.page} pageCount={Math.ceil(data.total / data.pageSize)} onPage={(p) => set({ page: p }, false)} label={t("pagination")} />
          </div>
        </div>
      ) : null}
    </>
  );
}
