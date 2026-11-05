"use client";

import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdminOption } from "@/lib/api/types";

import type { Lang } from "./productDraft";

function AddValue({ onAdd, label }: { readonly onAdd: (text: string) => void; readonly label: string }) {
  const t = useTranslations("admin");
  const [text, setText] = React.useState("");
  const add = () => {
    if (!text.trim()) return;
    onAdd(text.trim());
    setText("");
  };
  return (
    <span className="inline-flex items-center gap-1">
      <Input aria-label={label} className="h-8 w-36 rounded-full text-sm" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} placeholder={t("newValue")} />
      <Button variant="outline" size="sm" className="h-8 px-3" onClick={add}>{t("axisAdd")}</Button>
    </span>
  );
}

/** Axes de variante (saveur, format…) et leurs valeurs ; les combinaisons sont générées par le backend. */
export function OptionsEditor({ options, lang, onChange }: { readonly options: AdminOption[]; readonly lang: Lang; readonly onChange: (options: AdminOption[]) => void }) {
  const t = useTranslations("admin");
  const update = (i: number, next: AdminOption | null) => onChange(next ? options.map((o, j) => (j === i ? next : o)) : options.filter((_, j) => j !== i));
  return (
    <div className="flex flex-col gap-4">
      {options.map((option, i) => (
        <div key={option.id ?? `new-${i}`} className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Input aria-label={t("axisName")} className="h-9 w-48 font-medium" value={option.name[lang]} onChange={(e) => update(i, { ...option, name: { ...option.name, [lang]: e.target.value } })} />
            <Button variant="ghost" size="sm" onClick={() => update(i, null)}>{t("removeAxis")}</Button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {option.values.map((value, k) => (
              <span key={value.id ?? `v-${k}`} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-secondary pr-1.5 pl-3 text-[13px] font-medium text-secondary-foreground">
                {value.label[lang] || value.label.fr}
                <button type="button" aria-label={t("axisRemove", { value: value.label[lang] || value.label.fr })} className="inline-flex size-6 cursor-pointer items-center justify-center rounded-full hover:bg-card" onClick={() => update(i, { ...option, values: option.values.filter((_, m) => m !== k) })}>
                  <X aria-hidden="true" className="size-3.5" />
                </button>
              </span>
            ))}
            <AddValue label={`${t("newValue")} · ${option.name[lang]}`} onAdd={(text) => update(i, { ...option, values: [...option.values, { label: { fr: text, en: text } }] })} />
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" className="w-fit" onClick={() => onChange([...options, { name: { fr: "", en: "" }, values: [] }])}>
        <Plus aria-hidden="true" />{t("addAxis")}
      </Button>
    </div>
  );
}
