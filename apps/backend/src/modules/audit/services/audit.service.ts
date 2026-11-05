import { Injectable } from "@nestjs/common";

import { type AuditFilters, AuditRepository } from "../repositories/audit.repository";

/** Journal d'audit du back-office (socle) : chaque écriture d'un agent laisse une trace. */
@Injectable()
export class AuditService {
  constructor(private readonly repo: AuditRepository) {}

  log(
    actorUserId: string | null,
    action: string,
    targetType: string,
    targetId: string | null,
    diff?: Record<string, unknown>,
  ) {
    return this.repo.insert({ actorUserId, action, targetType, targetId, diff: diff ?? null });
  }

  async list(filters: AuditFilters, page: number, pageSize: number) {
    const { rows, total } = await this.repo.list(filters, page, pageSize);
    return {
      items: rows.map(({ log, actorName }) => ({
        id: log.id,
        actor: log.actorUserId ? { id: log.actorUserId, name: actorName ?? "" } : null,
        action: log.action,
        targetType: log.targetType,
        targetId: log.targetId,
        diff: log.diff,
        createdAt: log.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    };
  }
}
