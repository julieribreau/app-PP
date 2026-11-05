import * as React from "react";

import { formatDate, formatMessage, formatPrice, type MessageValues } from "@/lib/format/format";
import { messages } from "@/lib/i18n/messages";
import { usePrefsStore } from "@/stores/prefs.store";

/**
 * Textes de la langue choisie (préférence locale, sinon l'appareil) et formateurs liés à elle :
 * `f(t.cart.items, { count })`, `price(290)`, `date(iso)`.
 */
export function useI18n() {
  const locale = usePrefsStore((s) => s.locale);
  return React.useMemo(
    () => ({
      locale,
      t: messages(locale),
      f: (template: string, values?: MessageValues) => formatMessage(template, values, locale),
      price: (cents: number) => formatPrice(cents, locale),
      date: (iso: string, style?: "month" | "long") => formatDate(iso, locale, style),
    }),
    [locale],
  );
}
