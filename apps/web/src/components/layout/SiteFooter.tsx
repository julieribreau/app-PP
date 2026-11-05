import { ConsentSettingsLink } from "@nutrion/cmp/web";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

/** Pied de page : éditeur, pages légales et réouverture du gestionnaire de cookies. */
export function SiteFooter() {
  const t = useTranslations("footer");
  const tc = useTranslations("consent");
  return (
    <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-border px-6 py-8 md:px-12">
      <span className="text-sm text-muted-foreground">{t("copyright", { year: new Date().getFullYear() })}</span>
      <nav aria-label={t("legal")} className="flex flex-wrap items-center gap-6 text-sm">
        <Link href="/mentions-legales" className="hover:text-primary">{t("mentions")}</Link>
        <Link href="/confidentialite" className="hover:text-primary">{t("privacy")}</Link>
        <Link href="/cgu" className="hover:text-primary">{t("terms")}</Link>
        <Link href="/cookies" className="hover:text-primary">{t("cookies")}</Link>
        <ConsentSettingsLink label={tc("settingsLink")} />
      </nav>
    </footer>
  );
}
