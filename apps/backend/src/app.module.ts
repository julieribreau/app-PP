import { Module } from "@nestjs/common";
import { APP_GUARD, APP_PIPE } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { LoggerModule } from "nestjs-pino";
import { ZodValidationPipe } from "nestjs-zod";
// import { DbModule } from "@nutrion/db";          // possède DATABASE_URL (tranche d'env isolée)
// import { dbSchema } from "@nutrion/db-schema";

import { loggerParams } from "./common/logger.params";
import { loadEnv } from "./config/env";
import { HealthModule } from "./modules/health/health.module";
import { ExampleModule } from "./modules/example/example.module";
// + un module par domaine fonctionnel retenu (comptes-auth (authentification, gestion-comptes-backoffice, roles-permissions, double-authentification), conformite-rgpd, facturation-paiement (catalogue et panier seulement)) : auth, account, audit, ...
// NB : le module `cron` tourne dans un PROCESS séparé (cron/main.ts), pas importé ici.

/**
 * AppModule — compose les modules autonomes + la connexion DB (une fois par process root).
 * Pas de ConfigModule global : chaque module possède sa propre config (cf architecture-reference §isolation config).
 */
@Module({
  imports: [
    LoggerModule.forRoot(loggerParams("api")), // Pino, sans en-têtes ni chaîne de requête
    // Rate limiting (socle hardening) : THROTTLE_LIMIT requêtes par minute et par IP.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: loadEnv().THROTTLE_LIMIT }]),
    // DbModule.forRoot({ schema: dbSchema }),
    HealthModule.forRoot({ service: "api" }), // /v1/health + /v1/health/ready (socle)
    ExampleModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard }, // throttler global
    // Valide chaque @Body/@Query/@Param typé par une DTO createZodDto : sans ce pipe, rien
    // n'est validé et la requête passe telle quelle au service.
    { provide: APP_PIPE, useClass: ZodValidationPipe },
  ],
})
export class AppModule {}
