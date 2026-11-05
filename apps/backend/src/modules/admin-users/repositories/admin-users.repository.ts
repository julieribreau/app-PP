import { Inject, Injectable } from "@nestjs/common";
import { address, type Drizzle, session, user } from "@nutrion/db-schema";
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  isNotNull,
  isNull,
  or,
  type SQL,
  sql,
} from "drizzle-orm";

import { DRIZZLE } from "../../db/db.module";

export type UsersFilters = {
  q?: string;
  role?: "user" | "admin";
  status?: "active" | "suspended" | "unverified";
  sort: "createdAt" | "lastLoginAt" | "name" | "email";
  order: "asc" | "desc";
};

/** Montant TTC du panier de l'usager, en centimes (prix propre de la variante ou du produit). */
const cartTotal = sql<number>`coalesce((
  select sum(ci.quantity * coalesce(v.price_cents, p.price_cents))
  from cart c
  join cart_item ci on ci.cart_id = c.id
  join product_variant v on v.id = ci.variant_id
  join product p on p.id = v.product_id
  where c.user_id = "user"."id"
), 0)::int`;

@Injectable()
export class AdminUsersRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Drizzle) {}

  private where(f: Omit<UsersFilters, "sort" | "order">): SQL | undefined {
    const conds: SQL[] = [isNull(user.anonymizedAt)];
    if (f.q) {
      const like = `%${f.q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
      conds.push(or(ilike(user.name, like), ilike(user.email, like))!);
    }
    if (f.role) conds.push(eq(user.role, f.role));
    if (f.status === "suspended") conds.push(isNotNull(user.suspendedAt));
    if (f.status === "unverified")
      conds.push(isNull(user.suspendedAt), eq(user.emailVerified, false));
    if (f.status === "active") conds.push(isNull(user.suspendedAt), eq(user.emailVerified, true));
    return and(...conds);
  }

  async list(f: UsersFilters, page: number | null, pageSize: number | null) {
    const column = {
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      name: user.name,
      email: user.email,
    }[f.sort];
    const direction = f.order === "asc" ? asc(column) : sql`${column} desc nulls last`;
    let query = this.db
      .select({ user, cartTotalCents: cartTotal })
      .from(user)
      .where(this.where(f))
      .orderBy(direction, desc(user.id))
      .$dynamic();
    if (page && pageSize) query = query.limit(pageSize).offset((page - 1) * pageSize);
    const rows = await query;
    const [total] = await this.db.select({ n: count() }).from(user).where(this.where(f));
    return { rows, total: total?.n ?? 0 };
  }

  async counts() {
    const [row] = await this.db
      .select({
        total: count(),
        unverified: sql<number>`count(*) filter (where ${user.emailVerified} = false and ${user.suspendedAt} is null)::int`,
        suspended: sql<number>`count(*) filter (where ${user.suspendedAt} is not null)::int`,
      })
      .from(user)
      .where(isNull(user.anonymizedAt));
    return row ?? { total: 0, unverified: 0, suspended: 0 };
  }

  async byId(id: string) {
    const [row] = await this.db
      .select({ user, cartTotalCents: cartTotal })
      .from(user)
      .where(and(eq(user.id, id), isNull(user.anonymizedAt)))
      .limit(1);
    return row;
  }

  addresses(userId: string) {
    return this.db
      .select()
      .from(address)
      .where(eq(address.userId, userId))
      .orderBy(desc(address.isDefault));
  }

  sessions(userId: string) {
    return this.db
      .select({
        id: session.id,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
      })
      .from(session)
      .where(eq(session.userId, userId))
      .orderBy(desc(session.createdAt));
  }

  async update(id: string, patch: Partial<typeof user.$inferInsert>) {
    await this.db.update(user).set(patch).where(eq(user.id, id));
  }

  async revokeSessions(userId: string) {
    await this.db.delete(session).where(eq(session.userId, userId));
  }
}
