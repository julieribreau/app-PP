import createMiddleware from "next-intl/middleware";
import { locales, defaultLocale } from "@nutrion/i18n";

// Routage localisé /{locale}/... (cf fr,en). `proxy.ts` : nom de l'ancien
// `middleware.ts` depuis Next 16.
export default createMiddleware({ locales: [...locales], defaultLocale });

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
