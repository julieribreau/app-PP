import { Injectable } from "@nestjs/common";

import { forbidden, notFound } from "../../../common/app-error";
import { AuditService } from "../../audit/services/audit.service";
import { toCsv, userStatus } from "../domain/user-status";
import { AdminUsersRepository, type UsersFilters } from "../repositories/admin-users.repository";

type Row = Awaited<ReturnType<AdminUsersRepository["byId"]>> & {};

function view({ user: u, cartTotalCents }: Row) {
  return {
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    name: u.name,
    email: u.email,
    emailVerified: u.emailVerified,
    role: u.role === "admin" ? "admin" : "user",
    status: userStatus(u),
    createdAt: u.createdAt.toISOString(),
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    cartTotalCents,
  };
}

/** Back-office ▸ Usagers (brique gestion-comptes-backoffice). */
@Injectable()
export class AdminUsersService {
  constructor(
    private readonly repo: AdminUsersRepository,
    private readonly audit: AuditService,
  ) {}

  async list(f: UsersFilters, page: number, pageSize: number) {
    const [{ rows, total }, counts] = await Promise.all([
      this.repo.list(f, page, pageSize),
      this.repo.counts(),
    ]);
    return { items: rows.map(view), total, page, pageSize, counts };
  }

  async get(id: string) {
    const row = await this.repo.byId(id);
    if (!row) throw notFound("USER_NOT_FOUND", "Usager introuvable");
    const [addresses, sessions] = await Promise.all([
      this.repo.addresses(id),
      this.repo.sessions(id),
    ]);
    return {
      ...view(row),
      phone: row.user.phone,
      suspendedAt: row.user.suspendedAt?.toISOString() ?? null,
      suspendedReason: row.user.suspendedReason,
      twoFactorEnabled: row.user.twoFactorEnabled,
      addresses: addresses.map((a) => ({
        id: a.id,
        label: a.label,
        recipientName: a.recipientName,
        line1: a.line1,
        line2: a.line2,
        postalCode: a.postalCode,
        city: a.city,
        countryCode: a.countryCode,
        isDefault: a.isDefault,
      })),
      sessions: sessions.map((s) => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
      })),
    };
  }

  async suspend(actorId: string, id: string, reason: string) {
    if (actorId === id)
      throw forbidden("CANNOT_TARGET_SELF", "Vous ne pouvez pas suspendre votre propre compte");
    await this.get(id);
    await this.repo.update(id, {
      suspendedAt: new Date(),
      suspendedReason: reason,
      suspendedBy: actorId,
    });
    await this.repo.revokeSessions(id); // déconnecté partout, immédiatement
    await this.audit.log(actorId, "account.suspend", "user", id, { reason });
    return this.get(id);
  }

  async reactivate(actorId: string, id: string) {
    await this.get(id);
    await this.repo.update(id, {
      suspendedAt: null,
      suspendedReason: null,
      suspendedBy: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
    await this.audit.log(actorId, "account.reactivate", "user", id);
    return this.get(id);
  }

  async changeRole(actorId: string, id: string, role: "user" | "admin") {
    if (actorId === id)
      throw forbidden("CANNOT_TARGET_SELF", "Vous ne pouvez pas changer votre propre rôle");
    const before = await this.get(id);
    await this.repo.update(id, { role });
    await this.audit.log(actorId, "account.role", "user", id, { before: before.role, after: role });
    return this.get(id);
  }

  async exportCsv(actorId: string, f: UsersFilters) {
    const { rows } = await this.repo.list(f, null, null);
    await this.audit.log(actorId, "account.export_list", "user", null, {
      filters: f,
      count: rows.length,
    });
    return toCsv(
      [
        "id",
        "prénom",
        "nom",
        "e-mail",
        "rôle",
        "statut",
        "e-mail vérifié",
        "inscription",
        "dernière connexion",
        "panier (€ TTC)",
      ],
      rows.map(({ user: u, cartTotalCents }) => [
        u.id,
        u.firstName,
        u.lastName,
        u.email,
        u.role,
        userStatus(u),
        u.emailVerified ? "oui" : "non",
        u.createdAt,
        u.lastLoginAt,
        (cartTotalCents / 100).toFixed(2).replace(".", ","),
      ]),
    );
  }
}
