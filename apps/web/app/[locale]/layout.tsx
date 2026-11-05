import { isLocale } from "@nutrion/i18n";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";

import "@/fonts";
import { AppConsent } from "@/components/consent/AppConsent";
import { PreprodBanner } from "@/components/env/PreprodBanner";
import { THEME_COOKIE, parseTheme } from "@/lib/theme";
import { Providers } from "@/providers/Providers";
import "@nutrion/ui-tokens/tokens.css"; // design tokens partagés (piste B, ADR-002)
import "@nutrion/cmp/web/consent.css"; // bandeau et gestionnaire de consentement
import "@nutrion/ui/ui.css"; // composants partagés (packages/ui)
import "../globals.css"; // Tailwind + base de l'app

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common");
  return { title: { default: t("appName"), template: `%s · ${t("appName")}` } };
}

// Layout racine localisé — fr,en. Polices auto-hébergées (@fontsource, aucun appel à Google).
// Le thème choisi (cookie) est posé sur <html> dès le rendu serveur : pas de flash. Sentry :
// instrumentation*.ts et app/global-error.tsx. PostHog : seulement après consentement.
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const messages = await getMessages();
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html lang={locale} data-theme={theme === "system" ? undefined : theme} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider messages={messages}>
          <Providers theme={theme}>
            <AppConsent>
              <PreprodBanner appEnv={process.env.NEXT_PUBLIC_APP_ENV} />
              {children}
            </AppConsent>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
