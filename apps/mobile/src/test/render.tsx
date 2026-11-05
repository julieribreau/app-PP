import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react-native";
import * as React from "react";

/** Rendu sous les fournisseurs de l'app (cache de requêtes neuf à chaque test). */
export async function renderWithProviders(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  const result = await render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
  return { client, ...result };
}
