import { beforeEach, describe, expect, it } from "vitest";

import { useExampleStore } from "./example.store";

// Un store Zustand se teste par son état, sans rendu : getState / setState.
describe("useExampleStore", () => {
  beforeEach(() => {
    useExampleStore.setState({ selectedId: null });
  });

  it("ne sélectionne rien au départ", () => {
    expect(useExampleStore.getState().selectedId).toBeNull();
  });

  it("retient la sélection, puis la retire", () => {
    useExampleStore.getState().select("e1");
    expect(useExampleStore.getState().selectedId).toBe("e1");

    useExampleStore.getState().select(null);
    expect(useExampleStore.getState().selectedId).toBeNull();
  });

  it("prévient les abonnés à chaque changement", () => {
    const vus: Array<string | null> = [];
    const desabonner = useExampleStore.subscribe((etat) => vus.push(etat.selectedId));

    useExampleStore.getState().select("e1");
    useExampleStore.getState().select("e2");
    desabonner();
    useExampleStore.getState().select("e3");

    expect(vus).toEqual(["e1", "e2"]);
  });
});
