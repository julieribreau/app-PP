import { Module } from "@nestjs/common";
import { APP_GUARD, APP_PIPE } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { LoggerModule } from "nestjs-pino";
import { ZodValidationPipe } from "nestjs-zod";

import { loggerParams } from "./common/logger.params";
import { loadEnv } from "./config/env";
import { AccountModule } from "./modules/account/account.module";
import { AdminUsersModule } from "./modules/admin-users/admin-users.module";
import { AuditModule } from "./modules/audit/audit.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CartModule } from "./modules/cart/cart.module";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { DbModule } from "./modules/db/db.module";
import { HealthModule } from "./modules/health/health.module";
import { MailModule } from "./modules/mail/mail.module";
import { StorageModule } from "./modules/storage/storage.module";
// NB : le module `cron` tourne dans un PROCESS séparé (cron/main.ts), pas importé ici.

/**
 * AppModule : modules autonomes, un par domaine (comptes-auth, conformite-rgpd, catalogue et
 * panier de facturation-paiement, audit). Pas de ConfigModule global : chaque module lit sa
 * propre tranche d'env (architecture-reference §isolation config).
 */
@Module({
  imports: [
    LoggerModule.forRoot(loggerParams("api")), // Pino, sans en-têtes ni chaîne de requête
    // Rate limiting (socle hardening) : THROTTLE_LIMIT requêtes par minute et par IP.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: loadEnv().THROTTLE_LIMIT }]),
    DbModule,
    StorageModule,
    MailModule,
    AuthModule,
    AuditModule,
    HealthModule.forRoot({ service: "api" }), // /v1/health + /v1/health/ready (socle)
    CatalogModule,
    CartModule,
    AccountModule,
    AdminUsersModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard }, // throttler global
    // Valide chaque @Body/@Query/@Param typé par une DTO createZodDto.
    { provide: APP_PIPE, useClass: ZodValidationPipe },
  ],
})
export class AppModule {}
