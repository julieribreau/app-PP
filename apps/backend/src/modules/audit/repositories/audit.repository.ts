import { Inject, Injectable } from "@nestjs/common";
import { auditLog, type Drizzle, user } from "@nutrion/db-schema";
import { and, count, desc, eq, type SQL } from "drizzle-orm";

import { DRIZZLE } from "../../db/db.module";

export type AuditFilters = { targetType?: string; targetId?: string; actorId?: string };

@Injectable()
export class AuditRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Drizzle) {}

  async insert(entry: typeof auditLog.$inferInsert) {
    await this.db.insert(auditLog).values(entry);
  }

  async list(filters: AuditFilters, page: number, pageSize: number) {
    const conds: SQL[] = [];
    if (filters.targetType) conds.push(eq(auditLog.targetType, filters.targetType));
    if (filters.targetId) conds.push(eq(auditLog.targetId, filters.targetId));
    if (filters.actorId) conds.push(eq(auditLog.actorUserId, filters.actorId));
    const where = conds.length ? and(...conds) : undefined;
    const rows = await this.db
      .select({ log: auditLog, actorName: user.name })
      .from(auditLog)
      .leftJoin(user, eq(user.id, auditLog.actorUserId))
      .where(where)
      .orderBy(desc(auditLog.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    const [totalRow] = await this.db.select({ n: count() }).from(auditLog).where(where);
    return { rows, total: totalRow?.n ?? 0 };
  }
}
