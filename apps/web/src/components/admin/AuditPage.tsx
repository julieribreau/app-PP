"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";

import { Pagination } from "@/components/shop/Pagination";
import { ErrorNote, Loading } from "@/components/ui/spinner";
import { useUrlState } from "@/hooks/useUrlState";
import type { AuditEntry } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import { useApi } from "@/providers/ApiProvider";

import { AdminHeading } from "./AdminShell";
import { DataTable, type DataColumn } from "./DataTable";

const KEYS = ["targetType", "page"] as const;

function diffSummary(diff: AuditEntry["diff"]): string {
  if (!diff) return "—";
  const text = Object.keys(diff).join(", ");
  return text.length > 60 ? `${text.slice(0, 57)}…` : text || "—";
}

/** Journal d'audit du back-office : lecture seule, du plus récent au plus ancien. */
export function AuditPage() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const api = useApi();
  const [state, set] = useUrlState(KEYS);
  const query = {
    targetType: state.targetType || undefined,
    page: Math.max(1, Number(state.page) || 1),
    pageSize: 25,
  };
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["admin", "audit", query],
    queryFn: () => api.admin.audit(query),
    placeholderData: keepPreviousData,
  });
  const columns: DataColumn<AuditEntry>[] = [
    {
      id: "date",
      header: t("auditDate"),
      className: "font-numeric text-[13px]",
      cell: (e) => formatDateTime(e.createdAt, locale),
    },
    { id: "actor", header: t("auditActor"), cell: (e) => e.actor?.name ?? t("auditSystem") },
    {
      id: "action",
      header: t("auditAction"),
      className: "font-numeric text-[13px]",
      cell: (e) => e.action,
    },
    {
      id: "target",
      header: t("auditTarget"),
      className: "font-numeric text-[13px]",
      cell: (e) => `${e.targetType}${e.targetId ? ` · ${e.targetId.slice(0, 8)}` : ""}`,
    },
    {
      id: "diff",
      header: t("auditChanges"),
      className: "text-[13px] text-muted-foreground",
      cell: (e) => diffSummary(e.diff),
    },
  ];
  return (
    <>
      <AdminHeading title={t("audit")} />
      <label className="text-muted-foreground flex w-fit items-center gap-1.5 text-sm">
        {t("auditTarget")}
        <select
          className="border-input bg-card text-foreground h-10 rounded-[12px] border px-2"
          value={state.targetType}
          onChange={(e) => set({ targetType: e.target.value })}
        >
          <option value="">{t("all")}</option>
          {["user", "product", "category"].map((k) => (
            <option key={k} value={k}>
              {t(`auditTargets.${k}`)}
            </option>
          ))}
        </select>
      </label>
      {isPending ? (
        <Loading />
      ) : isError ? (
        <ErrorNote onRetry={() => void refetch()} />
      ) : (
        <DataTable
          rows={data.items}
          columns={columns}
          getRowId={(e) => e.id}
          caption={t("audit")}
          minWidth={820}
        />
      )}
      {data ? (
        <Pagination
          page={data.page}
          pageCount={Math.ceil(data.total / data.pageSize)}
          onPage={(p) => set({ page: p }, false)}
          label={t("pagination")}
        />
      ) : null}
    </>
  );
}
