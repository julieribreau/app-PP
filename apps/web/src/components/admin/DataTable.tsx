"use client";

import { createColumnHelper, tableFeatures, useTable, type RowData } from "@tanstack/react-table";
import { ArrowDown, ArrowUp } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/cn";

// Tableau du back-office sur TanStack Table v9 (cœur seul) : tri, filtres et pagination sont
// faits par le backend (paramètres dans l'URL) ; le tableau rend les lignes reçues.

export interface DataColumn<T> {
  id: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  /** Clé de tri envoyée au backend ; colonne triable si présente. */
  sortKey?: string;
  align?: "left" | "right";
  className?: string;
}

export interface SortState {
  key: string;
  order: "asc" | "desc";
}

const features = tableFeatures({});

function SortButton<T>({
  column,
  sort,
  onSort,
}: {
  readonly column: DataColumn<T>;
  readonly sort?: SortState;
  readonly onSort?: (key: string) => void;
}) {
  const active = sort?.key === column.sortKey;
  const Icon = sort?.order === "asc" ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={() => column.sortKey && onSort?.(column.sortKey)}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1 uppercase",
        active && "text-foreground",
      )}
    >
      {column.header}
      {active ? <Icon aria-hidden="true" className="size-3" strokeWidth={2} /> : null}
    </button>
  );
}

function ariaSort(
  column: { sortKey?: string },
  sort?: SortState,
): "ascending" | "descending" | "none" | undefined {
  if (!column.sortKey) return undefined;
  if (sort?.key !== column.sortKey) return "none";
  return sort.order === "asc" ? "ascending" : "descending";
}

export function DataTable<T extends RowData>({
  rows,
  columns,
  getRowId,
  caption,
  sort,
  onSort,
  minWidth = 960,
}: {
  readonly rows: T[];
  readonly columns: DataColumn<T>[];
  readonly getRowId: (row: T) => string;
  readonly caption: string;
  readonly sort?: SortState;
  readonly onSort?: (key: string) => void;
  readonly minWidth?: number;
}) {
  const tableColumns = React.useMemo(() => {
    const helper = createColumnHelper<typeof features, T>();
    return helper.columns(
      columns.map((c) => helper.display({ id: c.id, cell: (info) => c.cell(info.row.original) })),
    );
  }, [columns]);
  const table = useTable({
    features,
    columns: tableColumns,
    data: rows,
    getRowId: (row) => getRowId(row),
  });
  const byId = new Map(columns.map((c) => [c.id, c]));

  return (
    <div className="border-border bg-card overflow-x-auto rounded-[18px] border">
      <table className="w-full border-collapse text-[15px]" style={{ minWidth }}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.id}
                scope="col"
                aria-sort={ariaSort(column, sort)}
                className={cn(
                  "border-border font-numeric text-muted-foreground border-b px-3.5 py-3 text-left text-xs leading-4 font-medium tracking-[.06em] whitespace-nowrap uppercase",
                  column.align === "right" && "text-right",
                )}
              >
                {column.sortKey ? (
                  <SortButton column={column} sort={sort} onSort={onSort} />
                ) : (
                  column.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="hover:bg-muted">
              {row.getAllCells().map((cell) => {
                const column = byId.get(cell.column.id);
                return (
                  <td
                    key={cell.id}
                    className={cn(
                      "border-border border-b px-3.5 py-3 align-middle whitespace-nowrap",
                      column?.align === "right" && "text-right",
                      column?.className,
                    )}
                  >
                    <table.FlexRender cell={cell} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
