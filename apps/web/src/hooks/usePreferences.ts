"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import * as React from "react";

import { usePathname, useRouter } from "@/i18n/navigation";
import type { Theme } from "@/lib/api/types";
import { useApi } from "@/providers/ApiProvider";
import { useTheme } from "@/providers/ThemeProvider";

import { useSession } from "./useSession";

/**
 * Langue et thème : appliqués tout de suite, et enregistrés dans le profil quand on est
 * connecté (socle : préférence du compte > navigateur > défaut).
 */
export function usePreferences() {
  const api = useApi();
  const client = useQueryClient();
  const { user } = useSession();
  const { theme, setTheme } = useTheme();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  const persist = React.useCallback(
    (patch: { theme?: Theme; locale?: string }) => {
      if (!user) return;
      void api.account.update(patch).then((profile) => client.setQueryData(["me"], profile));
    },
    [api, client, user],
  );

  const changeTheme = React.useCallback(
    (next: Theme) => {
      setTheme(next);
      persist({ theme: next });
    },
    [setTheme, persist],
  );

  const changeLocale = React.useCallback(
    (next: string) => {
      persist({ locale: next });
      const query = search.toString();
      router.replace(`${pathname}${query ? `?${query}` : ""}`, { locale: next });
    },
    [persist, router, pathname, search],
  );

  return { theme, locale, changeTheme, changeLocale };
}
