"use client";

import { useSearchParams } from "next/navigation";
import * as React from "react";

import { usePathname, useRouter } from "@/i18n/navigation";

/** Filtres d'une liste gardés dans l'URL (partageables, retour arrière) : lecture et mise à jour. */
export function useUrlState<K extends string>(keys: readonly K[]) {
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const values = React.useMemo(
    () => Object.fromEntries(keys.map((k) => [k, search.get(k) ?? ""])) as Record<K, string>,
    [keys, search],
  );
  // Dernière URL écrite : deux changements rapprochés (réinitialiser puis filtrer) partent
  // de la précédente, pas de `search`, que le routeur n'a pas encore mis à jour ; sinon le
  // second ressuscite ce que le premier venait d'effacer.
  const latest = React.useRef(search.toString());
  React.useEffect(() => {
    latest.current = search.toString();
  }, [search]);
  const set = React.useCallback(
    (patch: Partial<Record<K, string | number | undefined>>, resetPage = true) => {
      const next = new URLSearchParams(latest.current);
      if (resetPage) next.delete("page");
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === "" || v === null) next.delete(k);
        else next.set(k, String(v));
      }
      const q = next.toString();
      latest.current = q;
      router.replace(`${pathname}${q ? `?${q}` : ""}`, { scroll: false });
    },
    [router, pathname],
  );
  return [values, set] as const;
}
