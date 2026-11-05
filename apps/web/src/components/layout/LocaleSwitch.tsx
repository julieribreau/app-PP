"use client";

import { locales } from "@nutrion/i18n";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { usePreferences } from "@/hooks/usePreferences";

/**
 * Bascule FR ⇄ EN sur la même page ; l'étiquette annonce la langue courante et la cible.
 * Elle commence par le code affiché (« FR ») : la commande vocale « clique FR » la trouve
 * (WCAG 2.5.3, libellé visible contenu dans le nom).
 */
export function LocaleSwitch() {
  const t = useTranslations("locale");
  const { locale, changeLocale } = usePreferences();
  const next = locales.find((l) => l !== locale) ?? locales[0];
  return (
    <Button
      variant="ghost"
      size="icon"
      className="font-numeric w-auto px-3 text-[13px]"
      aria-label={`${locale.toUpperCase()} – ${t("label")} : ${t(locale as "fr" | "en")}. ${t("switchTo", { language: t(next) })}`}
      lang={next}
      onClick={() => changeLocale(next)}
    >
      {locale.toUpperCase()}
    </Button>
  );
}
