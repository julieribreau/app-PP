import { useTranslations } from "next-intl";

import { cn } from "@/lib/cn";

// Visuel de remplacement tant qu'un produit n'a pas de photo : une forme selon la famille
// (barre, sachet, pot), dans les couleurs de marque. Décoratif : le nom du produit est à côté.

type Kind = "bar" | "bag" | "pot";
const PALETTES = [
  ["var(--cacao)", "var(--peach)"],
  ["var(--straw)", "var(--peach)"],
  ["var(--peach)", "var(--straw)"],
  ["var(--primary)", "var(--cacao)"],
] as const;

export function kindFor(categorySlug: string | undefined): Kind {
  if (!categorySlug) return "bar";
  if (categorySlug.includes("granola")) return "bag";
  if (/boisson|tartin|pot/.test(categorySlug)) return "pot";
  return "bar";
}

function paletteFor(seed: string): readonly [string, string] {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTES[h % PALETTES.length] ?? PALETTES[0];
}

function Shape({ kind, c1, c2 }: { readonly kind: Kind; readonly c1: string; readonly c2: string }) {
  if (kind === "bag")
    return (
      <>
        <path d="M56 12h48l8 70H48Z" style={{ fill: c1 }} />
        <rect x="56" y="12" width="48" height="12" rx="3" style={{ fill: c2 }} />
        <rect x="64" y="40" width="32" height="20" rx="10" style={{ fill: "var(--card)" }} />
      </>
    );
  if (kind === "pot")
    return (
      <>
        <rect x="56" y="22" width="48" height="60" rx="10" style={{ fill: c1 }} />
        <rect x="52" y="10" width="56" height="16" rx="5" style={{ fill: c2 }} />
        <rect x="64" y="44" width="32" height="18" rx="9" style={{ fill: "var(--card)" }} />
      </>
    );
  return (
    <>
      <rect x="14" y="28" width="132" height="38" rx="12" style={{ fill: c1 }} />
      <rect x="14" y="28" width="132" height="13" rx="6.5" style={{ fill: c2 }} />
      {[40, 72, 104, 128].map((cx, i) => (
        <circle key={cx} cx={cx} cy={i % 2 ? 57 : 52} r={i % 2 ? 3 : 4} style={{ fill: "var(--straw)" }} />
      ))}
    </>
  );
}

export interface ProductImageProps {
  readonly name: string;
  readonly imageUrl: string | null;
  readonly categorySlug?: string;
  readonly seed?: string;
  readonly className?: string;
  /** Largeur relative du visuel de remplacement dans son cadre. */
  readonly fill?: string;
}

export function ProductImage({ name, imageUrl, categorySlug, seed, className, fill = "66%" }: ProductImageProps) {
  const t = useTranslations("product");
  const [c1, c2] = paletteFor(seed ?? name);
  return (
    <div className={cn("flex items-center justify-center overflow-hidden bg-muted", className)}>
      {imageUrl ? (
        <img src={imageUrl} alt={t("imageAlt", { name })} className="size-full object-cover" />
      ) : (
        <svg viewBox="0 0 160 90" width={fill} role="img" aria-label={t("imagePlaceholder")}>
          <Shape kind={kindFor(categorySlug)} c1={c1} c2={c2} />
        </svg>
      )}
    </div>
  );
}
