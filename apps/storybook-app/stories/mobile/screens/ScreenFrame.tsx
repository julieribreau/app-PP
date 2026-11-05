import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { queryKeys } from "@/lib/api/query";

import { addresses, cart, categories, me, products } from "./fixtures";

type StoryWindow = Window & { __storySession?: { user: { id: string; email: string } } | null };

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/** Écran de l'app sous un cache déjà rempli : aucune requête ne part du catalogue. */
export function ScreenFrame({
  children,
  signedIn = false,
}: {
  children: React.ReactNode;
  signedIn?: boolean;
}) {
  (window as StoryWindow).__storySession = signedIn
    ? { user: { id: me.id, email: me.email } }
    : null;
  const client = React.useMemo(() => {
    const qc = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity, retry: false, enabled: true } },
    });
    for (const locale of ["fr", "en"]) {
      qc.setQueryData(queryKeys.categories(locale), categories);
      qc.setQueryData(queryKeys.products(locale, null, ""), products);
    }
    qc.setQueryData(queryKeys.cart, cart);
    if (signedIn) {
      qc.setQueryData(queryKeys.me, me);
      qc.setQueryData(queryKeys.addresses, addresses);
    }
    return qc;
  }, [signedIn]);
  return (
    <SafeAreaProvider initialMetrics={metrics}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </SafeAreaProvider>
  );
}
