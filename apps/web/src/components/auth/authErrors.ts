// Codes d'erreur Better Auth (et du verrouillage du backend) → clé de message auth.*.
const LOCKED_STATUS = new Set([423, 429]);

function isLocked(code: string, status: number | undefined): boolean {
  return code.includes("LOCK") || LOCKED_STATUS.has(status ?? 0);
}

export function authErrorKey(error: { code?: string; status?: number } | null | undefined): string {
  const code = error?.code ?? "";
  if (code === "EMAIL_NOT_VERIFIED") return "emailNotVerified";
  if (isLocked(code, error?.status)) return "locked";
  if (/^INVALID_(EMAIL|PASSWORD)/.test(code) || error?.status === 401) return "invalidCredentials";
  return "error";
}
