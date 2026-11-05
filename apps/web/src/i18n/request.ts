import { getRequestConfig } from "next-intl/server";
import { defaultLocale, loadMessages } from "@nutrion/i18n";

// Config requête next-intl — charge les dictionnaires partagés (@nutrion/i18n).
export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) ?? defaultLocale;
  return { locale, messages: await loadMessages(locale) };
});
