"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { CART_KEY } from "@/hooks/useCart";
import { useRouter } from "@/i18n/navigation";
import { identifyUser } from "@/lib/analytics/posthog";
import { authClient } from "@/lib/auth-client";
import { useApi } from "@/providers/ApiProvider";
import { useTheme } from "@/providers/ThemeProvider";

/** Destination après connexion : `?next=/chemin` interne, sinon l'espace personnel. */
export function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/compte";
}

/**
 * Après la connexion : fusion du panier invité dans celui du compte, préférences du profil
 * (thème, langue) appliquées, puis redirection.
 */
export function useAfterSignIn() {
  const api = useApi();
  const client = useQueryClient();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("cart");
  const { setTheme } = useTheme();
  const next = safeNext(useSearchParams().get("next"));

  return React.useCallback(async () => {
    await authClient.getSession({ query: { disableCookieCache: true } });
    const cart = await api.cart.merge().catch(() => null);
    if (cart) client.setQueryData(CART_KEY, cart);
    if (cart?.merged) toast.success(t("merged"));
    const me = await api.account.me().catch(() => null);
    if (me) {
      client.setQueryData(["me"], me);
      setTheme(me.theme);
      identifyUser(me.id);
    }
    router.replace(next, { locale: me?.locale && me.locale !== locale ? me.locale : locale });
    router.refresh();
  }, [api, client, router, locale, t, setTheme, next]);
}
