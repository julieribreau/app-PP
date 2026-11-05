"use client";

import { authClient } from "@/lib/auth-client";

/** Session Better Auth (null si invité) et son état de chargement. */
export function useSession() {
  const { data, isPending, refetch } = authClient.useSession();
  return { session: data ?? null, user: data?.user ?? null, isPending, refetch };
}
