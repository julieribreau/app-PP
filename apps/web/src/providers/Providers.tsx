"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";
import { Toaster } from "sonner";

import type { Theme } from "@/lib/api/types";

import { ApiProvider } from "./ApiProvider";
import { ThemeProvider } from "./ThemeProvider";

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
    },
  });
}

/** Fournisseurs client de toute l'app : requêtes, API, thème, notifications. */
export function Providers({ theme, children }: { readonly theme: Theme; readonly children: React.ReactNode }) {
  const [client] = React.useState(makeQueryClient);
  return (
    <QueryClientProvider client={client}>
      <ApiProvider>
        <ThemeProvider initial={theme}>
          {children}
          <Toaster
            position="bottom-center"
            toastOptions={{
              className: "!bg-card !text-card-foreground !border-border !rounded-[14px] !font-body",
            }}
          />
        </ThemeProvider>
      </ApiProvider>
    </QueryClientProvider>
  );
}
