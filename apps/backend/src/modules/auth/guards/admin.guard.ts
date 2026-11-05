import { type CanActivate, type ExecutionContext, Injectable } from "@nestjs/common";

import { AppError } from "../../../common/app-error";
import { type RequestWithSession, SessionGuard } from "./session.guard";

/**
 * Back-office : session + rôle `admin` + double authentification activée (socle). Sans 2FA,
 * 403 TWO_FACTOR_REQUIRED : le web fait activer la 2FA avant d'ouvrir le back-office.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly sessionGuard: SessionGuard) {}

  async canActivate(context: ExecutionContext) {
    await this.sessionGuard.canActivate(context);
    const { auth } = context.switchToHttp().getRequest<RequestWithSession>();
    if (auth?.user.role !== "admin")
      throw new AppError(403, "FORBIDDEN", "Accès réservé aux administrateurs");
    if (!auth.user.twoFactorEnabled) {
      throw new AppError(403, "TWO_FACTOR_REQUIRED", "Double authentification requise");
    }
    return true;
  }
}
