import { api } from "@/lib/api/client";

// hooks/<domaine>/ — encapsulent l'accès données + logique d'écran.
export function useExample() {
  // ponytail: TanStack Query sur le port (skill mobile-dev-expo §5) :
  // useQuery({ queryKey: ["examples"], queryFn: () => api.get("/examples") })
  return { data: [] as Array<{ id: string }>, reload: () => api.get<unknown>("/examples") };
}
