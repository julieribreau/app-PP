"use client";

import { useTranslations } from "next-intl";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { Address, AddressInput } from "@/lib/api/types";

const FIELDS = [
  { name: "label", key: "label", auto: "off", required: false },
  { name: "recipientName", key: "recipient", auto: "name", required: true },
  { name: "line1", key: "line1", auto: "address-line1", required: true },
  { name: "line2", key: "line2", auto: "address-line2", required: false },
  { name: "postalCode", key: "postalCode", auto: "postal-code", required: true },
  { name: "city", key: "city", auto: "address-level2", required: true },
  { name: "phone", key: "phone", auto: "tel", required: false },
] as const;

function toInput(form: FormData): AddressInput {
  const get = (k: string) => String(form.get(k) ?? "").trim();
  return {
    label: get("label") || null,
    recipientName: get("recipientName"),
    line1: get("line1"),
    line2: get("line2") || null,
    postalCode: get("postalCode"),
    city: get("city"),
    countryCode: "FR",
    phone: get("phone") || null,
  };
}

/** Création ou modification d'une adresse de livraison. */
export function AddressDialog({
  open,
  onOpenChange,
  address,
  onSubmit,
  pending,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly address: Address | null;
  readonly onSubmit: (input: AddressInput) => void;
  readonly pending: boolean;
}) {
  const t = useTranslations("account");
  const tc = useTranslations("common");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={address ? tc("edit") : t("addAddress")}>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(toInput(new FormData(e.currentTarget)));
          }}
        >
          {FIELDS.map((f) => (
            <Field key={f.name} id={`addr-${f.name}`} label={t(`address.${f.key}`)}>
              <Input name={f.name} autoComplete={f.auto} required={f.required} defaultValue={(address?.[f.name] as string | null) ?? ""} />
            </Field>
          ))}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>{tc("cancel")}</Button>
            <Button type="submit" disabled={pending}>{tc("save")}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
