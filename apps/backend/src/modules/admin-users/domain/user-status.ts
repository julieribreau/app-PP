export type UserStatus = "active" | "suspended" | "unverified";

/** Statut affiché au back-office : suspendu prime sur non vérifié. */
export function userStatus(u: { suspendedAt: Date | null; emailVerified: boolean }): UserStatus {
  if (u.suspendedAt) return "suspended";
  if (!u.emailVerified) return "unverified";
  return "active";
}

/** Une cellule CSV : guillemets doublés, et pas de formule interprétée par un tableur. */
export function csvCell(value: unknown): string {
  if (value == null) return "";
  let s = value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  // BOM : Excel ouvre l'UTF-8 sans massacrer les accents ; point-virgule, séparateur français.
  return `\uFEFF${[header, ...rows].map((r) => r.map(csvCell).join(";")).join("\r\n")}\r\n`;
}
