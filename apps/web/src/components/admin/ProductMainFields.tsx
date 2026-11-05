"use client";

import { useLocale, useTranslations } from "next-intl";
import * as React from "react";

import { Field } from "@/components/ui/field";
import { Input, Select, inputClass } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import type { AdminCategory, AdminProductInput, ProductStatus } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import {
  centsToInput,
  formatPrice,
  formatVatRate,
  parsePriceInput,
  priceExclVat,
} from "@/lib/format";

import { type Lang, VAT_RATES } from "./productDraft";
import { RichTextEditor } from "./RichTextEditor";

/** Prix TTC saisi, HT calculé en direct (un seul montant stocké : le TTC). */
function PriceFields({
  input,
  onChange,
}: {
  readonly input: AdminProductInput;
  readonly onChange: (p: Partial<AdminProductInput>) => void;
}) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const [text, setText] = React.useState(centsToInput(input.priceCents, locale));
  return (
    <div className="grid grid-cols-3 items-end gap-3.5">
      <Field id="pf-price" label={t("priceTtc")}>
        <Input
          inputMode="decimal"
          className="font-numeric h-10"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            const c = parsePriceInput(e.target.value);
            if (c !== null) onChange({ priceCents: c });
          }}
        />
      </Field>
      <Field id="pf-vat" label={t("vat")}>
        <Select
          className="h-10"
          value={input.vatRateBps}
          onChange={(e) => onChange({ vatRateBps: Number(e.target.value) })}
        >
          {VAT_RATES.map((r) => (
            <option key={r} value={r}>
              {formatVatRate(r, locale)}
            </option>
          ))}
        </Select>
      </Field>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{t("priceHt")}</span>
        <output
          className={cn(inputClass, "border-border bg-muted font-numeric flex h-10 items-center")}
        >
          {formatPrice(priceExclVat(input.priceCents, input.vatRateBps), locale)}
        </output>
      </div>
    </div>
  );
}

/** Titre de la fiche et choix de la langue du contenu. */
function SheetHeader({
  lang,
  onLang,
}: {
  readonly lang: Lang;
  readonly onLang: (lang: Lang) => void;
}) {
  const t = useTranslations("admin");
  const tl = useTranslations("locale");
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id="pm-title" className="m-0 text-[17px] leading-6 font-semibold">
        {t("productSheet")}
      </h2>
      <Segmented<Lang>
        label={t("contentLanguage")}
        value={lang}
        onChange={onLang}
        options={[
          { value: "fr", label: tl("fr") },
          { value: "en", label: tl("en") },
        ]}
      />
    </div>
  );
}

function StatusField({
  value,
  onChange,
}: {
  readonly value: ProductStatus;
  readonly onChange: (status: ProductStatus) => void;
}) {
  const t = useTranslations("admin");
  return (
    <Field id="pf-status" label={t("status")}>
      <Select
        className="h-10 w-auto"
        value={value}
        onChange={(e) => onChange(e.target.value as ProductStatus)}
      >
        {(["draft", "active", "archived"] as const).map((s) => (
          <option key={s} value={s}>
            {t(`productStatus.${s}`)}
          </option>
        ))}
      </Select>
    </Field>
  );
}

/** Fiche produit : textes par langue, catégorie, prix, TVA, statut. */
export function ProductMainFields({
  input,
  categories,
  lang,
  onLang,
  onChange,
}: {
  readonly input: AdminProductInput;
  readonly categories: AdminCategory[];
  readonly lang: Lang;
  readonly onLang: (lang: Lang) => void;
  readonly onChange: (patch: Partial<AdminProductInput>) => void;
}) {
  const t = useTranslations("admin");
  const setText = (key: "name" | "summary" | "description", value: string) =>
    onChange({ [key]: { ...input[key], [lang]: value } });
  return (
    <section
      aria-labelledby="pm-title"
      className="border-border bg-card flex min-w-0 flex-[999_1_460px] flex-col gap-4 rounded-[18px] border p-6"
    >
      <SheetHeader lang={lang} onLang={onLang} />
      <div className="grid grid-cols-2 gap-3.5">
        <Field id="pf-name" label={`${t("name")} (${lang.toUpperCase()})`}>
          <Input
            className="h-10"
            value={input.name[lang]}
            onChange={(e) => setText("name", e.target.value)}
            required={lang === "fr"}
          />
        </Field>
        <Field id="pf-category" label={t("col.category")}>
          <Select
            className="h-10"
            value={input.categoryId ?? ""}
            onChange={(e) => onChange({ categoryId: e.target.value || null })}
          >
            <option value="">—</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name[lang] || c.name.fr}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field id="pf-summary" label={`${t("summary")} (${lang.toUpperCase()})`}>
        <Input
          className="h-10"
          value={input.summary[lang]}
          onChange={(e) => setText("summary", e.target.value)}
        />
      </Field>
      <RichTextEditor
        key={lang}
        id="pf-description"
        label={`${t("description")} (${lang.toUpperCase()})`}
        value={input.description[lang]}
        onChange={(html) => setText("description", html)}
      />
      <PriceFields input={input} onChange={onChange} />
      <StatusField value={input.status} onChange={(status) => onChange({ status })} />
    </section>
  );
}
