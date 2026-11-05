export type AdminAccess = "loading" | "anonymous" | "forbidden" | "needs-2fa" | "granted";

/** Accès au back-office : connecté, rôle admin, double authentification activée. */
export function adminAccess(
  isPending: boolean,
  user: { role?: string | null; twoFactorEnabled?: boolean | null } | null,
): AdminAccess {
  if (isPending) return "loading";
  if (!user) return "anonymous";
  if (user.role !== "admin") return "forbidden";
  return user.twoFactorEnabled ? "granted" : "needs-2fa";
}
