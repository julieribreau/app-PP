import { Global, Module } from "@nestjs/common";
import type { Drizzle } from "@nutrion/db-schema";

import { DRIZZLE } from "../db/db.module";
import { MAIL, type MailPort } from "../mail/mail.port";
import { loadAuthConfig } from "./auth.config";
import { createAuth } from "./auth.factory";
import { AuthService } from "./auth.service";
import { AUTH } from "./auth.tokens";
import { AdminGuard } from "./guards/admin.guard";
import { OptionalSessionGuard, SessionGuard } from "./guards/session.guard";

export { AUTH } from "./auth.tokens";

@Global()
@Module({
  providers: [
    {
      provide: AUTH,
      inject: [DRIZZLE, MAIL],
      useFactory: (db: Drizzle, mail: MailPort) =>
        createAuth({ db, mail, config: loadAuthConfig() }),
    },
    AuthService,
    SessionGuard,
    OptionalSessionGuard,
    AdminGuard,
  ],
  exports: [AUTH, AuthService, SessionGuard, OptionalSessionGuard, AdminGuard],
})
export class AuthModule {}
