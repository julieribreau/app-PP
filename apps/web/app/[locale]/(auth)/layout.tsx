import { ConsentSettingsLink } from "@nutrion/cmp/web";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

// Connexion, inscription, mot de passe : formulaire à gauche, composition de marque à droite.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations();
  return (
    <div className="flex min-h-dvh flex-wrap">
      <section className="flex flex-[1_1_520px] flex-col gap-10 px-6 pt-8 pb-12 md:px-12">
        <Link href="/" className="display text-[26px] leading-8 hover:text-primary">{t("common.appName")}</Link>
        <div className="mx-auto flex w-full max-w-[420px] flex-col gap-6">{children}</div>
        <nav aria-label={t("footer.legal")} className="mt-auto flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <Link href="/mentions-legales">{t("footer.mentions")}</Link>
          <span aria-hidden="true">·</span>
          <Link href="/confidentialite">{t("footer.privacy")}</Link>
          <span aria-hidden="true">·</span>
          <Link href="/cookies">{t("footer.cookies")}</Link>
          <span aria-hidden="true">·</span>
          <ConsentSettingsLink label={t("consent.settingsLink")} />
        </nav>
      </section>
      <aside aria-hidden="true" className="relative min-h-[360px] flex-[1_1_480px] overflow-hidden bg-primary">
        <div className="absolute top-[60px] -right-[60px] size-80 rounded-full bg-peach" />
        <div className="absolute bottom-20 left-[60px] h-[300px] w-[180px] rounded-full bg-straw" />
        <div className="absolute -bottom-10 left-[280px] h-[180px] w-[260px] rounded-[40px] bg-secondary" />
        <p className="display absolute top-[72px] left-[60px] m-0 max-w-[360px] text-[40px] leading-[44px] text-primary-foreground">{t("auth.tagline")}</p>
      </aside>
    </div>
  );
}
