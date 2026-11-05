"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/card";
import type { Address, AddressInput } from "@/lib/api/types";
import { useApi } from "@/providers/ApiProvider";

import { AddressDialog } from "./AddressDialog";

const KEY = ["addresses"] as const;

function AddressCard({ address, onEdit }: { readonly address: Address; readonly onEdit: () => void }) {
  const t = useTranslations("account");
  const tc = useTranslations("common");
  const api = useApi();
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: KEY });
  return (
    <article className="flex flex-col gap-1 rounded-[14px] border border-border px-[18px] py-4">
      <div className="flex items-center justify-between gap-2">
        <strong>{address.label || address.recipientName}</strong>
        {address.isDefault ? <Badge tone="success">{t("address.default")}</Badge> : null}
      </div>
      <span className="text-sm text-muted-foreground">
        {[address.line1, address.line2, `${address.postalCode} ${address.city}`].filter(Boolean).join(", ")}
      </span>
      <div className="mt-2 flex flex-wrap gap-4 text-sm">
        <button type="button" className="cursor-pointer underline" onClick={onEdit}>{tc("edit")}</button>
        {address.isDefault ? null : (
          <button type="button" className="cursor-pointer underline" onClick={() => void api.account.setDefaultAddress(address.id).then(refresh)}>{t("address.makeDefault")}</button>
        )}
        <button type="button" className="cursor-pointer underline" onClick={() => void api.account.deleteAddress(address.id).then(refresh)}>{tc("delete")}</button>
      </div>
    </article>
  );
}

/** Adresses de livraison : liste, ajout, modification, adresse par défaut, suppression. */
export function AddressesSection() {
  const t = useTranslations("account");
  const tc = useTranslations("common");
  const api = useApi();
  const client = useQueryClient();
  const { data = [] } = useQuery({ queryKey: KEY, queryFn: () => api.account.addresses() });
  const [editing, setEditing] = React.useState<Address | null | undefined>(undefined);
  const save = useMutation({
    mutationFn: (input: AddressInput) => (editing ? api.account.updateAddress(editing.id, input) : api.account.createAddress(input)),
    onSuccess: () => {
      setEditing(undefined);
      toast.success(tc("saved"));
      void client.invalidateQueries({ queryKey: KEY });
    },
    onError: () => toast.error(tc("error")),
  });
  return (
    <section id="adresses" aria-labelledby="adresses-title" className="flex flex-col gap-4 rounded-[24px] border border-border bg-card p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <SectionTitle id="adresses-title">{t("addressesTitle")}</SectionTitle>
        <Button variant="outline" onClick={() => setEditing(null)}>{t("addAddress")}</Button>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-4">
        {data.map((address) => <AddressCard key={address.id} address={address} onEdit={() => setEditing(address)} />)}
      </div>
      <AddressDialog
        key={editing?.id ?? "new"}
        open={editing !== undefined}
        onOpenChange={(open) => !open && setEditing(undefined)}
        address={editing ?? null}
        onSubmit={(input) => save.mutate(input)}
        pending={save.isPending}
      />
    </section>
  );
}
