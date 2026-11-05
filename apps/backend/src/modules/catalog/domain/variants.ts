// Variantes = combinaisons des valeurs des axes (brique facturation-paiement §Catalogue).
// On vend toujours une variante : un produit sans axe en a une seule, de clé "".

export type OptionDef = { id: string; values: { id: string }[] };
export type OptionValues = Record<string, string>;

/** Clé unique d'une combinaison : identifiants de valeurs triés, joints. */
export function combinationKey(optionValues: OptionValues): string {
  return Object.values(optionValues).sort().join("|");
}

/** Produit cartésien des valeurs ; un axe sans valeur ne produit aucune combinaison. */
export function combinations(options: OptionDef[]): OptionValues[] {
  return options.reduce<OptionValues[]>(
    (acc, option) =>
      acc.flatMap((partial) => option.values.map((v) => ({ ...partial, [option.id]: v.id }))),
    [{}],
  );
}

export type ExistingVariant = { id: string; combinationKey: string; isActive: boolean };

/**
 * Ce qu'il faut faire des variantes quand les axes changent : les combinaisons connues sont
 * gardées (avec leur prix, SKU et stock), les nouvelles créées actives, celles qui ont perdu
 * une valeur désactivées (jamais supprimées : un panier peut encore les référencer).
 */
export function planVariantSync(options: OptionDef[], existing: ExistingVariant[]) {
  const wanted = combinations(options);
  const byKey = new Map(existing.map((v) => [v.combinationKey, v]));
  const wantedKeys = new Set(wanted.map(combinationKey));
  return {
    create: wanted
      .filter((ov) => !byKey.has(combinationKey(ov)))
      .map((ov) => ({ optionValues: ov, combinationKey: combinationKey(ov) })),
    reactivate: existing
      .filter((v) => wantedKeys.has(v.combinationKey) && !v.isActive)
      .map((v) => v.id),
    deactivate: existing
      .filter((v) => !wantedKeys.has(v.combinationKey) && v.isActive)
      .map((v) => v.id),
  };
}

/** « Cacao · À l'unité » : les libellés des valeurs, dans l'ordre des axes. */
export function variantLabel(
  options: { id: string; values: { id: string; label: string }[] }[],
  optionValues: OptionValues,
): string {
  return options
    .map((o) => o.values.find((v) => v.id === optionValues[o.id])?.label)
    .filter(Boolean)
    .join(" · ");
}

/** « 3 saveurs · 2 formats » ; null pour un produit sans axe. */
export function variantSummary(options: { name: string; values: unknown[] }[]): string | null {
  const parts = options
    .filter((o) => o.values.length > 1)
    .map((o) => {
      const name = o.name.toLowerCase();
      const plural = /[sxz]$/.test(name) ? name : `${name}s`;
      return `${o.values.length} ${plural}`;
    });
  return parts.length ? parts.join(" · ") : null;
}

/**
 * Variantes dans l'ordre des axes puis des valeurs (saisi au back-office), pas dans l'ordre de
 * création : la fiche produit présélectionne la première variante disponible, et l'usager
 * attend « Cacao · À l'unité » avant « Noisette · Boîte de 12 ». Une valeur inconnue va à la fin.
 */
export function sortVariants<V extends { optionValues: OptionValues }>(
  options: OptionDef[],
  variants: V[],
): V[] {
  const rank = (v: V) =>
    options.map((o) => {
      const i = o.values.findIndex((val) => val.id === v.optionValues[o.id]);
      return i === -1 ? Number.MAX_SAFE_INTEGER : i;
    });
  return [...variants].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    for (let i = 0; i < ra.length; i += 1) {
      const d = ra[i]! - rb[i]!;
      if (d !== 0) return d;
    }
    return 0;
  });
}
