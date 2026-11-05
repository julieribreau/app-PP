import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replace = vi.fn();
let params = new URLSearchParams("q=roux&page=2");

vi.mock("next/navigation", () => ({ useSearchParams: () => params }));
vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/admin/usagers",
  useRouter: () => ({ replace }),
}));

import { useUrlState } from "./useUrlState";

const KEYS = ["q", "status"] as const;

describe("filtres d'une liste dans l'URL", () => {
  beforeEach(() => {
    replace.mockClear();
    params = new URLSearchParams("q=roux&page=2");
  });

  it("lit les valeurs, vides par défaut", () => {
    const { result } = renderHook(() => useUrlState(KEYS));
    expect(result.current[0]).toEqual({ q: "roux", status: "" });
  });

  it("deux changements rapprochés ne ressuscitent pas un filtre effacé", () => {
    const { result } = renderHook(() => useUrlState(KEYS));
    // Réinitialiser, puis filtrer avant que le routeur n'ait rendu la nouvelle URL.
    act(() => result.current[1]({ q: "", status: "" }));
    act(() => result.current[1]({ status: "suspended" }));
    expect(replace).toHaveBeenLastCalledWith("/admin/usagers?status=suspended", { scroll: false });
  });

  it("revient à la première page quand un filtre change", () => {
    const { result } = renderHook(() => useUrlState(KEYS));
    act(() => result.current[1]({ status: "active" }));
    expect(replace).toHaveBeenLastCalledWith("/admin/usagers?q=roux&status=active", {
      scroll: false,
    });
  });
});
