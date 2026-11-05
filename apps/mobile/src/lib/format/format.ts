// Formatage des montants, des dates et des messages traduits (sous-ensemble ICU : variables
// `{name}` et `{count, plural, =0 {…} one {# …} other {# …}}`), sans dépendance : les
// dictionnaires partagés avec le web utilisent next-intl, qui lit la même syntaxe.

/** Centimes TTC → « 2,90 € » (fr) ou « €2.90 » (en). */
export function formatPrice(cents: number, locale: string): string {
  return new Intl.NumberFormat(locale === "en" ? "en-GB" : "fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

/** Points de base → « 5,5 % » (fr) ou « 5.5% » (en). */
export function formatRate(bps: number, locale: string): string {
  return new Intl.NumberFormat(locale === "en" ? "en-GB" : "fr-FR", {
    style: "percent",
    maximumFractionDigits: 2,
  }).format(bps / 10000);
}

/** ISO → « oct. 2026 » ; `long` → « 4 novembre 2026 ». */
export function formatDate(iso: string, locale: string, style: "month" | "long" = "long"): string {
  const options: Intl.DateTimeFormatOptions =
    style === "month"
      ? { month: "short", year: "numeric" }
      : { day: "numeric", month: "long", year: "numeric" };
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", options).format(
    new Date(iso),
  );
}

export type MessageValues = Record<string, string | number>;

/**
 * Remplace les variables d'un message traduit. Gère les pluriels ICU les plus courants ;
 * `#` vaut le nombre. Une variable absente reste telle quelle, visible en recette.
 */
export function formatMessage(template: string, values: MessageValues = {}, locale = "fr"): string {
  let out = "";
  let i = 0;
  while (i < template.length) {
    const char = template[i];
    if (char !== "{") {
      out += char;
      i += 1;
      continue;
    }
    const end = matchingBrace(template, i);
    if (end < 0) {
      out += template.slice(i);
      break;
    }
    out += renderArgument(template.slice(i + 1, end), values, locale);
    i = end + 1;
  }
  return out;
}

function matchingBrace(text: string, start: number): number {
  let depth = 0;
  for (let i = start; i < text.length; i += 1) {
    if (text[i] === "{") depth += 1;
    else if (text[i] === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function renderArgument(body: string, values: MessageValues, locale: string): string {
  const [rawName, kind, ...rest] = body.split(",");
  const name = (rawName ?? "").trim();
  if (kind?.trim() !== "plural") {
    const value = values[name];
    return value === undefined ? `{${name}}` : String(value);
  }
  const count = Number(values[name] ?? 0);
  const branches = parseBranches(rest.join(","));
  const category = new Intl.PluralRules(locale).select(count);
  const branch = branches[`=${count}`] ?? branches[category] ?? branches["other"] ?? "";
  return formatMessage(branch.replace(/#/g, String(count)), values, locale);
}

function parseBranches(text: string): Record<string, string> {
  const branches: Record<string, string> = {};
  let i = 0;
  while (i < text.length) {
    const open = text.indexOf("{", i);
    if (open < 0) break;
    const key = text.slice(i, open).trim();
    const close = matchingBrace(text, open);
    if (close < 0) break;
    branches[key] = text.slice(open + 1, close);
    i = close + 1;
  }
  return branches;
}

/** Initiales d'un nom pour l'avatar : « Camille Martin » → « CM ». */
export function initials(
  firstName?: string | null,
  lastName?: string | null,
  email?: string,
): string {
  const letters = [firstName, lastName]
    .map((part) => part?.trim().charAt(0) ?? "")
    .join("")
    .toUpperCase();
  return letters || (email?.charAt(0).toUpperCase() ?? "?");
}

/** Texte brut d'une description HTML assainie par le backend (pas de rendu HTML natif). */
export function htmlToText(html: string): string {
  return html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|h[1-6])>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
