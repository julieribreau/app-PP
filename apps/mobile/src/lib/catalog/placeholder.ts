// Visuel de remplacement tant que les photos produit n'existent pas (ADR-002) : une forme selon
// la catégorie (barre, sachet, pot) et un couple de couleurs de marque stable par produit.

export type PlaceholderKind = "bar" | "bag" | "pot";
export type BrandColor = "cacao" | "peach" | "straw" | "secondary" | "primary";

const PAIRS: ReadonlyArray<readonly [BrandColor, BrandColor]> = [
  ["cacao", "peach"],
  ["straw", "peach"],
  ["peach", "straw"],
  ["cacao", "secondary"],
  ["straw", "cacao"],
  ["primary", "cacao"],
];

export function placeholderKind(categorySlug: string | undefined | null): PlaceholderKind {
  if (!categorySlug) return "bar";
  if (categorySlug.includes("granola")) return "bag";
  if (categorySlug.includes("boisson") || categorySlug.includes("tartin")) return "pot";
  return "bar";
}

/** Même produit, mêmes couleurs, d'un écran à l'autre. */
export function placeholderColors(seed: string): readonly [BrandColor, BrandColor] {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return PAIRS[hash % PAIRS.length] ?? ["cacao", "peach"];
}
