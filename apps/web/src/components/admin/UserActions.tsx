"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { useSession } from "@/hooks/useSession";
import type { AdminUser } from "@/lib/api/types";
import { useApi } from "@/providers/ApiProvider";

type Action = "suspend" | "reactivate" | "makeAdmin" | "makeUser";

function useUserAction(user: AdminUser) {
  const api = useApi();
  const client = useQueryClient();
  const t = useTranslations("common");
  return useMutation({
    mutationFn: ({ action, reason }: { action: Action; reason?: string }) => {
      if (action === "suspend") return api.admin.suspend(user.id, reason ?? "");
      if (action === "reactivate") return api.admin.reactivate(user.id);
      return api.admin.setRole(user.id, action === "makeAdmin" ? "admin" : "user");
    },
    onSuccess: () => {
      toast.success(t("saved"));
      void client.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: () => toast.error(t("error")),
  });
}

/** Menu d'actions d'une ligne ; chaque action passe par une confirmation (et un motif pour la suspension). */
export function UserActions({ user }: { readonly user: AdminUser }) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const { user: me } = useSession();
  const [pending, setPending] = React.useState<Action | null>(null);
  const [reason, setReason] = React.useState("");
  const run = useUserAction(user);
  const self = me?.id === user.id;
  const actions: Action[] = [user.status === "suspended" ? "reactivate" : "suspend", user.role === "admin" ? "makeUser" : "makeAdmin"];
  const confirm = () => run.mutate({ action: pending!, reason }, { onSettled: () => setPending(null) });
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="iconSm" aria-label={t("actionsFor", { name: user.name })}><MoreHorizontal aria-hidden="true" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {actions.map((a) => (
            <DropdownMenuItem key={a} disabled={self} onSelect={() => { setReason(""); setPending(a); }}>{t(a)}</DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={pending !== null} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent title={pending ? t(pending) : ""} description={t("confirmUser", { name: user.name, email: user.email })}>
          {pending === "suspend" ? (
            <Field id={`reason-${user.id}`} label={t("suspendReason")}>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setPending(null)}>{tc("cancel")}</Button>
            <Button variant={pending === "suspend" ? "destructive" : "primary"} disabled={run.isPending || (pending === "suspend" && !reason.trim())} onClick={confirm}>
              {pending ? t(pending) : ""}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
