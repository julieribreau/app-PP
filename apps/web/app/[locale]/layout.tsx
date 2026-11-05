import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { ConsentSettingsLink } from "@nutrion/cmp/web";
import { AppConsent } from "@/components/consent/AppConsent";
import { PreprodBanner } from "@/components/env/PreprodBanner";
import "@nutrion/ui-tokens/tokens.css"; // design tokens partagés (charte)
import "@nutrion/cmp/web/consent.css"; // bandeau et gestionnaire de consentement
import "@nutrion/ui/ui.css"; // composants partagés (packages/ui)
import "../globals.css"; // base et composants locaux de l'app

// Layout racine localisé — fr,en. Sentry branché dès l'init : instrumentation*.ts et
// app/global-error.tsx. PostHog : seulement après consentement, par AppConsent (skill
// frontend-dev §15). Quand la politique cookies est publiée, AppConsent reçoit son lien
// (`policyHref`) et le pied de page la liste avec les autres pages légales.
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();
  const t = await getTranslations("consent");
  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <AppConsent>
            <PreprodBanner appEnv={process.env.NEXT_PUBLIC_APP_ENV} />
            {children}
            <footer>
              <ConsentSettingsLink label={t("settingsLink")} />
            </footer>
          </AppConsent>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
