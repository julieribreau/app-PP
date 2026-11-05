"use client";

import { locales } from "@nutrion/i18n";
import { useTranslations } from "next-intl";

import { SectionTitle } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { usePreferences } from "@/hooks/usePreferences";
import type { Theme } from "@/lib/api/types";
import { THEMES } from "@/lib/theme";

/** Langue et thème du compte, appliqués aussitôt et gardés d'un appareil à l'autre. */
export function PreferencesSection() {
  const t = useTranslations();
  const { locale, theme, changeLocale, changeTheme } = usePreferences();
  return (
    <section
      id="preferences"
      aria-labelledby="pref-title"
      className="border-border bg-card flex flex-col gap-4 rounded-[24px] border p-7"
    >
      <SectionTitle id="pref-title">{t("account.preferences")}</SectionTitle>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{t("locale.label")}</span>
        <Segmented
          label={t("locale.label")}
          value={locale}
          options={locales.map((l) => ({ value: l, label: t(`locale.${l}`) }))}
          onChange={changeLocale}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{t("theme.label")}</span>
        <Segmented<Theme>
          label={t("theme.label")}
          value={theme}
          options={THEMES.map((v) => ({ value: v, label: t(`theme.${v}`) }))}
          onChange={changeTheme}
        />
      </div>
    </section>
  );
}
