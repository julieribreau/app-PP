import { Inject, Injectable } from "@nestjs/common";
import {
  account,
  address,
  cart,
  type Drizzle,
  session,
  twoFactor,
  user,
  verification,
} from "@nutrion/db-schema";
import { and, asc, desc, eq, ne } from "drizzle-orm";

import { DRIZZLE } from "../../db/db.module";

export type AddressRow = typeof address.$inferSelect;

@Injectable()
export class AccountRepository {
  constructor(@Inject(DRIZZLE) readonly db: Drizzle) {}

  async user(id: string) {
    const [row] = await this.db.select().from(user).where(eq(user.id, id)).limit(1);
    return row;
  }

  async updateUser(id: string, patch: Partial<typeof user.$inferInsert>) {
    const [row] = await this.db.update(user).set(patch).where(eq(user.id, id)).returning();
    return row!;
  }

  addresses(userId: string) {
    return this.db
      .select()
      .from(address)
      .where(eq(address.userId, userId))
      .orderBy(desc(address.isDefault), asc(address.createdAt));
  }

  async address(userId: string, id: string) {
    const [row] = await this.db
      .select()
      .from(address)
      .where(and(eq(address.userId, userId), eq(address.id, id)))
      .limit(1);
    return row;
  }

  /** Une seule adresse par défaut : poser l'une retire les autres, dans la même transaction. */
  async saveAddress(
    userId: string,
    id: string | null,
    values: Partial<typeof address.$inferInsert>,
  ) {
    return this.db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: address.id })
        .from(address)
        .where(eq(address.userId, userId));
      const makeDefault =
        values.isDefault === true ||
        existing.length === 0 ||
        (id !== null && existing.length === 1);
      let row: AddressRow | undefined;
      if (id) {
        [row] = await tx
          .update(address)
          .set({ ...values, ...(makeDefault ? { isDefault: true } : {}) })
          .where(and(eq(address.id, id), eq(address.userId, userId)))
          .returning();
      } else {
        [row] = await tx
          .insert(address)
          .values({ ...(values as typeof address.$inferInsert), userId, isDefault: makeDefault })
          .returning();
      }
      if (row && row.isDefault) {
        await tx
          .update(address)
          .set({ isDefault: false })
          .where(and(eq(address.userId, userId), ne(address.id, row.id)));
      }
      return row;
    });
  }

  async deleteAddress(userId: string, id: string) {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .delete(address)
        .where(and(eq(address.userId, userId), eq(address.id, id)))
        .returning();
      if (row?.isDefault) {
        const [next] = await tx
          .select()
          .from(address)
          .where(eq(address.userId, userId))
          .orderBy(asc(address.createdAt))
          .limit(1);
        if (next) await tx.update(address).set({ isDefault: true }).where(eq(address.id, next.id));
      }
      return row;
    });
  }

  sessions(userId: string) {
    return this.db
      .select({
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
      })
      .from(session)
      .where(eq(session.userId, userId));
  }

  async cart(userId: string) {
    const [row] = await this.db.select().from(cart).where(eq(cart.userId, userId)).limit(1);
    return row;
  }

  /**
   * Suppression du compte = anonymisation (brique rgpd-droits-personnes) : la ligne reste pour
   * l'intégrité des journaux, plus rien n'y désigne la personne.
   */
  async anonymize(id: string) {
    await this.db.transaction(async (tx) => {
      const [u] = await tx.select({ email: user.email }).from(user).where(eq(user.id, id)).limit(1);
      await tx
        .update(user)
        .set({
          name: "Compte supprimé",
          email: `supprime+${id}@nutrion.invalid`,
          emailVerified: false,
          image: null,
          firstName: null,
          lastName: null,
          phone: null,
          role: "user",
          twoFactorEnabled: false,
          anonymizedAt: new Date(),
          failedLoginAttempts: 0,
          lockedUntil: null,
        })
        .where(eq(user.id, id));
      await tx.delete(session).where(eq(session.userId, id));
      await tx.delete(account).where(eq(account.userId, id));
      await tx.delete(twoFactor).where(eq(twoFactor.userId, id));
      await tx.delete(address).where(eq(address.userId, id));
      await tx.delete(cart).where(eq(cart.userId, id));
      if (u) await tx.delete(verification).where(eq(verification.identifier, u.email));
    });
  }
}
