import {
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  Inject,
  Injectable,
} from "@nestjs/common";
import type { Drizzle } from "@nutrion/db-schema";
import { user } from "@nutrion/db-schema";
import { eq } from "drizzle-orm";
import type { IncomingHttpHeaders } from "node:http";

import { AppError } from "../../../common/app-error";
import { DRIZZLE } from "../../db/db.module";
import { type AuthSession, AuthService } from "../auth.service";

export type RequestWithSession = { headers: IncomingHttpHeaders; auth?: AuthSession | null };

/** Session obligatoire : 401 UNAUTHORIZED sans session, 403 si le compte est suspendu. */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    @Inject(DRIZZLE) private readonly db: Drizzle,
  ) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<RequestWithSession>();
    const session = await this.authService.getSession(req.headers);
    if (!session) throw new AppError(401, "UNAUTHORIZED", "Connexion requise");
    // La session peut précéder la suspension : l'état du compte se relit à chaque requête.
    const [row] = await this.db
      .select({
        suspendedAt: user.suspendedAt,
        anonymizedAt: user.anonymizedAt,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled,
      })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);
    if (!row || row.suspendedAt || row.anonymizedAt) {
      throw new AppError(403, "ACCOUNT_SUSPENDED", "Compte suspendu");
    }
    session.user.role = row.role;
    session.user.twoFactorEnabled = row.twoFactorEnabled;
    req.auth = session;
    return true;
  }
}

/** Session facultative (panier : invité ou connecté). */
@Injectable()
export class OptionalSessionGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<RequestWithSession>();
    req.auth = await this.authService.getSession(req.headers).catch(() => null);
    return true;
  }
}

/** La session posée par un garde ; `CurrentSession()` dans un contrôleur. */
export const CurrentSession = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  return ctx.switchToHttp().getRequest<RequestWithSession>().auth ?? null;
});
