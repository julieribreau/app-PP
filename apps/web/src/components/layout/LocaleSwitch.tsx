"use client";

import { locales } from "@nutrion/i18n";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { usePreferences } from "@/hooks/usePreferences";

/** Bascule FR ⇄ EN sur la même page ; l'étiquette annonce la langue courante et la cible. */
export function LocaleSwitch() {
  const t = useTranslations("locale");
  const { locale, changeLocale } = usePreferences();
  const next = locales.find((l) => l !== locale) ?? locales[0];
  return (
    <Button
      variant="ghost"
      size="icon"
      className="w-auto px-3 font-numeric text-[13px]"
      aria-label={`${t("label")} : ${t(locale as "fr" | "en")}. ${t("switchTo", { language: t(next) })}`}
      lang={next}
      onClick={() => changeLocale(next)}
    >
      <span aria-hidden="true">{locale.toUpperCase()}</span>
    </Button>
  );
}
