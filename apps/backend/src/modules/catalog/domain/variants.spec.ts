import { describe, expect, it } from "vitest";

import {
  combinationKey,
  combinations,
  planVariantSync,
  sortVariants,
  variantLabel,
  variantSummary,
} from "./variants";

const saveur = { id: "o1", values: [{ id: "cacao" }, { id: "noisette" }] };
const format = { id: "o2", values: [{ id: "unite" }, { id: "boite" }] };

describe("combinaisons de variantes", () => {
  it("une variante unique de clé vide sans axe", () => {
    expect(combinations([])).toEqual([{}]);
    expect(combinationKey({})).toBe("");
  });

  it("le produit cartésien des axes", () => {
    const c = combinations([saveur, format]);
    expect(c).toHaveLength(4);
    expect(c).toContainEqual({ o1: "noisette", o2: "boite" });
  });

  it("une clé indépendante de l'ordre des axes", () => {
    expect(combinationKey({ o1: "b", o2: "a" })).toBe(combinationKey({ o2: "a", o1: "b" }));
  });

  it("garde, crée, réactive et désactive", () => {
    const existing = [
      { id: "v-cu", combinationKey: combinationKey({ o1: "cacao", o2: "unite" }), isActive: true },
      { id: "v-cb", combinationKey: combinationKey({ o1: "cacao", o2: "boite" }), isActive: false },
      {
        id: "v-mu",
        combinationKey: combinationKey({ o1: "myrtille", o2: "unite" }),
        isActive: true,
      },
      { id: "v-0", combinationKey: "", isActive: true },
    ];
    const plan = planVariantSync([saveur, format], existing);
    expect(plan.create.map((c) => c.optionValues)).toEqual([
      { o1: "noisette", o2: "unite" },
      { o1: "noisette", o2: "boite" },
    ]);
    expect(plan.reactivate).toEqual(["v-cb"]);
    expect(plan.deactivate).toEqual([]);
    expect(plan.remove.sort()).toEqual(["v-0", "v-mu"]);
  });

  it("supprime la variante unique d'origine, mais garde désactivée une orpheline au panier", () => {
    const existing = [
      { id: "v-unique", combinationKey: "", isActive: true },
      {
        id: "v-vieille",
        combinationKey: combinationKey({ o1: "myrtille", o2: "unite" }),
        isActive: true,
        inCart: true,
      },
    ];
    const plan = planVariantSync([saveur, format], existing);
    expect(plan.create).toHaveLength(4);
    expect(plan.remove).toEqual(["v-unique"]);
    expect(plan.deactivate).toEqual(["v-vieille"]);
  });
});

describe("libellés", () => {
  const opts = [
    {
      id: "o1",
      name: "Saveur",
      values: [
        { id: "a", label: "Cacao" },
        { id: "b", label: "Noisette" },
      ],
    },
    {
      id: "o2",
      name: "Format",
      values: [
        { id: "c", label: "À l'unité" },
        { id: "d", label: "Boîte de 12" },
      ],
    },
  ];
  it("compose le libellé d'une variante dans l'ordre des axes", () => {
    expect(variantLabel(opts, { o2: "d", o1: "a" })).toBe("Cacao · Boîte de 12");
  });
  it("résume les axes", () => {
    expect(variantSummary(opts)).toBe("2 saveurs · 2 formats");
    expect(variantSummary([{ name: "Poids", values: [1] }])).toBeNull();
  });
});

describe("ordre des variantes", () => {
  it("suit l'ordre des axes puis des valeurs, pas celui de création", () => {
    const v = (id: string, o1: string, o2: string) => ({ id, optionValues: { o1, o2 } });
    const created = [
      v("a", "noisette", "boite"),
      v("b", "cacao", "boite"),
      v("c", "noisette", "unite"),
      v("d", "cacao", "unite"),
    ];
    expect(sortVariants([saveur, format], created).map((x) => x.id)).toEqual(["d", "b", "c", "a"]);
  });

  it("garde à la fin une variante dont une valeur a disparu", () => {
    const v = (id: string, o1: string) => ({ id, optionValues: { o1 } });
    expect(
      sortVariants([saveur], [v("x", "myrtille"), v("y", "noisette")]).map((x) => x.id),
    ).toEqual(["y", "x"]);
  });
});
