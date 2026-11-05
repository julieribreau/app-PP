"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ErrorNote, Loading } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { errorCode } from "@/lib/api/http";
import type { AdminCategory, Localized } from "@/lib/api/types";
import { useApi } from "@/providers/ApiProvider";

import { AdminHeading } from "./AdminShell";
import { DataTable, type DataColumn } from "./DataTable";

const KEY = ["admin", "categories"] as const;
type Form = { slug: string; name: Localized; isActive: boolean };

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function CategoryDialog({
  category,
  onClose,
}: {
  readonly category: AdminCategory | null;
  readonly onClose: () => void;
}) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const api = useApi();
  const client = useQueryClient();
  const [form, setForm] = React.useState<Form>(
    category
      ? { slug: category.slug, name: category.name, isActive: category.isActive }
      : { slug: "", name: { fr: "", en: "" }, isActive: true },
  );
  const save = useMutation({
    mutationFn: () =>
      category
        ? api.admin.updateCategory(category.id, form)
        : api.admin.createCategory({ ...form, slug: form.slug || slugify(form.name.fr) }),
    onSuccess: () => {
      toast.success(tc("saved"));
      void client.invalidateQueries({ queryKey: KEY });
      onClose();
    },
    onError: () => toast.error(tc("error")),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={category ? tc("edit") : t("newCategory")}>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <Field id="cat-fr" label={`${t("name")} (FR)`}>
            <Input
              required
              value={form.name.fr}
              onChange={(e) => setForm({ ...form, name: { ...form.name, fr: e.target.value } })}
            />
          </Field>
          <Field id="cat-en" label={`${t("name")} (EN)`}>
            <Input
              value={form.name.en}
              onChange={(e) => setForm({ ...form, name: { ...form.name, en: e.target.value } })}
            />
          </Field>
          <Field id="cat-slug" label={t("slug")} help={t("slugHelp")}>
            <Input
              value={form.slug}
              placeholder={slugify(form.name.fr)}
              onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
            />
          </Field>
          <label className="flex items-center gap-3 text-sm font-medium">
            <Switch
              checked={form.isActive}
              onCheckedChange={(isActive) => setForm({ ...form, isActive })}
            />
            {t("isActive")}
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {tc("save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function useRemoveCategory(): (c: AdminCategory) => Promise<void> {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const api = useApi();
  const client = useQueryClient();
  return async (c) => {
    try {
      await api.admin.deleteCategory(c.id);
      void client.invalidateQueries({ queryKey: KEY });
    } catch (e) {
      toast.error(errorCode(e) ? t("deleteCategoryError") : tc("error"));
    }
  };
}

function useCategoryColumns(onEdit: (c: AdminCategory) => void): DataColumn<AdminCategory>[] {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const remove = useRemoveCategory();
  return [
    {
      id: "name",
      header: t("col.name"),
      cell: (c) => (
        <span className="font-medium">
          {c.name.fr}
          <span className="text-muted-foreground"> · {c.name.en}</span>
        </span>
      ),
    },
    { id: "slug", header: t("slug"), className: "font-numeric text-[13px]", cell: (c) => c.slug },
    {
      id: "count",
      header: t("products"),
      align: "right",
      className: "font-numeric",
      cell: (c) => c.productCount,
    },
    {
      id: "active",
      header: t("status"),
      cell: (c) => (
        <Badge tone={c.isActive ? "success" : "muted"}>
          {c.isActive ? t("statuses.active") : t("variantState.disabled")}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: <span className="sr-only">{t("col.actions")}</span>,
      align: "right",
      cell: (c) => (
        <span className="inline-flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => onEdit(c)}>
            {tc("edit")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={c.productCount > 0}
            onClick={() => void remove(c)}
          >
            {tc("delete")}
          </Button>
        </span>
      ),
    },
  ];
}

/** Catégories de la boutique : création, renommage FR/EN, activation, suppression si vide. */
export function CategoriesPage() {
  const t = useTranslations("admin");
  const api = useApi();
  const [editing, setEditing] = React.useState<AdminCategory | null | undefined>(undefined);
  const columns = useCategoryColumns(setEditing);
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: KEY,
    queryFn: () => api.admin.categories(),
  });
  return (
    <>
      <AdminHeading
        title={t("categories")}
        actions={
          <Button size="sm" onClick={() => setEditing(null)}>
            <Plus aria-hidden="true" />
            {t("newCategory")}
          </Button>
        }
      />
      {isPending ? (
        <Loading />
      ) : isError ? (
        <ErrorNote onRetry={() => void refetch()} />
      ) : (
        <DataTable
          rows={data}
          columns={columns}
          getRowId={(c) => c.id}
          caption={t("categories")}
          minWidth={640}
        />
      )}
      {editing !== undefined ? (
        <CategoryDialog
          key={editing?.id ?? "new"}
          category={editing}
          onClose={() => setEditing(undefined)}
        />
      ) : null}
    </>
  );
}
