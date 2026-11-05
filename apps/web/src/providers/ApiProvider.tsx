"use client";

import { useLocale } from "next-intl";
import * as React from "react";

import { createApi, type Api } from "@/lib/api/endpoints";

const ApiContext = React.createContext<Api | null>(null);

/** Client API dans la langue de l'interface (en-tête Accept-Language). */
export function ApiProvider({ children, api }: { readonly children: React.ReactNode; readonly api?: Api }) {
  const locale = useLocale();
  const value = React.useMemo(() => api ?? createApi(locale), [api, locale]);
  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
}

export function useApi(): Api {
  const ctx = React.useContext(ApiContext);
  if (!ctx) throw new Error("useApi hors de ApiProvider");
  return ctx;
}
