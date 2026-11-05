"use client";

import { Download } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { saveBlob } from "@/lib/api/http";
import { authClient } from "@/lib/auth-client";
import { useApi } from "@/providers/ApiProvider";

const WORD: Record<string, string> = { fr: "SUPPRIMER", en: "DELETE" };

function DeleteDialog({
  open,
  onOpenChange,
}: {
  readonly open: boolean;
  readonly onOpenChange: (o: boolean) => void;
}) {
  const t = useTranslations("account");
  const tc = useTranslations("common");
  const locale = useLocale();
  const api = useApi();
  const [value, setValue] = React.useState("");
  const word = WORD[locale] ?? "DELETE";
  const confirm = async () => {
    try {
      await api.account.deleteAccount(value);
      await authClient.signOut();
      // Navigation complète : la page compte, encore montée, redirigerait sinon vers la
      // connexion (session disparue) avant que l'accueil ne s'affiche.
      window.location.replace(`/${locale}`);
    } catch {
      toast.error(tc("error"));
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={t("deleteConfirmTitle")} description={t("deleteConfirmBody")}>
        <Field id="delete-confirm" label={t("deleteConfirmInput")}>
          <Input value={value} onChange={(e) => setValue(e.target.value)} autoComplete="off" />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button
            variant="destructive"
            disabled={value.trim() !== word}
            onClick={() => void confirm()}
          >
            {t("deleteAccount")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Droits RGPD : copie de ses données (ZIP) et suppression du compte (anonymisation). */
export function DataSection() {
  const t = useTranslations("account");
  const tc = useTranslations("common");
  const api = useApi();
  const [open, setOpen] = React.useState(false);
  const exportData = async () => {
    try {
      saveBlob(await api.account.exportData(), "nutrionapp-mes-donnees.zip");
    } catch {
      toast.error(tc("error"));
    }
  };
  return (
    <section
      id="donnees"
      aria-labelledby="data-title"
      className="border-border bg-card flex flex-col gap-4 rounded-[24px] border p-7"
    >
      <SectionTitle id="data-title">{t("data")}</SectionTitle>
      <p className="text-muted-foreground m-0">{t("dataLead")}</p>
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => void exportData()}>
          <Download aria-hidden="true" strokeWidth={1.75} />
          {t("export")}
        </Button>
        <Button variant="destructive" onClick={() => setOpen(true)}>
          {t("deleteAccount")}
        </Button>
      </div>
      <DeleteDialog open={open} onOpenChange={setOpen} />
    </section>
  );
}
