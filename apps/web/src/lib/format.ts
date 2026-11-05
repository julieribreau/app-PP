// Formatage des montants et des dates, dans la langue de l'interface. Les montants arrivent
// en centimes TTC (contrat d'API) : jamais de flottant stocké, la division se fait ici.

export function formatPrice(cents: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(cents / 100);
}

/** Taux de TVA en points de base (550) → « 5,5 % ». */
export function formatVatRate(bps: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 2 }).format(
    bps / 10_000,
  );
}

/** Prix HT dérivé du TTC, arrondi au centime (le TTC est le prix de référence). */
export function priceExclVat(ttcCents: number, vatRateBps: number): number {
  return Math.round(ttcCents / (1 + vatRateBps / 10_000));
}

export function formatDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat(locale, { dateStyle: "short", timeZone: "Europe/Paris" }).format(
    new Date(iso),
  );
}

export function formatDateTime(iso: string | null | undefined, locale: string): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(new Date(iso));
}

/** Saisie d'un montant (« 2,90 », « 2.9 €») → centimes ; null si illisible ou vide. */
export function parsePriceInput(value: string): number | null {
  const cleaned = value.replace(/[^\d,.-]/g, "").replace(",", ".");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

/** Centimes → valeur de champ (« 2,90 » en français). */
export function centsToInput(cents: number | null | undefined, locale: string): string {
  if (cents === null || cents === undefined) return "";
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, useGrouping: false }).format(
    cents / 100,
  );
}
