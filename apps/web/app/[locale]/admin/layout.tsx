import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminShell } from "@/components/admin/AdminShell";

// Back-office : rôle admin et double authentification exigés (socle), vérifiés côté backend
// sur chaque appel /v1/admin/* ; la garde ici ne fait que l'expérience.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <AdminShell>{children}</AdminShell>
    </AdminGuard>
  );
}
