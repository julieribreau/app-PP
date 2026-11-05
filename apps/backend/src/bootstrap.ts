import type { NestExpressApplication } from "@nestjs/platform-express";
import { toNodeHandler } from "better-auth/node";

import { HttpExceptionFilter } from "./common/http-exception.filter";
import { loadEnv } from "./config/env";
import { AUTH_BASE_PATH } from "./modules/auth/auth.config";
import type { Auth } from "./modules/auth/auth.factory";
import { AUTH } from "./modules/auth/auth.tokens";

/**
 * Réglages communs à main.ts et aux tests d'intégration : l'API testée est celle qui tourne.
 * L'application doit être créée avec `bodyParser: false` : Better Auth lit lui-même le corps
 * de ses requêtes, il est donc monté AVANT le parseur JSON de Nest.
 */
export function configureApp(app: NestExpressApplication) {
  const env = loadEnv();
  app.setGlobalPrefix("v1"); // API versionnée
  app.useGlobalFilters(new HttpExceptionFilter()); // { statusCode, code, message } ; 5xx vers Sentry
  // Derrière le proxy du site (Next réécrit /api → backend) : l'adresse de l'usager se lit
  // dans X-Forwarded-For, posé par un proxy local ou du réseau privé seulement.
  app.set("trust proxy", "loopback, linklocal, uniquelocal");
  const origins = env.CORS_ORIGINS.split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  // Le navigateur passe par le proxy du site (même origine) : CORS ne sert qu'au dev
  // (Expo web) ; l'app native n'en a pas besoin.
  app.enableCors({
    origin: origins.length ? origins : false,
    credentials: true,
    exposedHeaders: ["X-Cart-Token"],
  });

  const auth = app.get<Auth>(AUTH);
  app.getHttpAdapter().getInstance().all(`${AUTH_BASE_PATH}/{*splat}`, toNodeHandler(auth));

  app.useBodyParser("json", { limit: "1mb" });
  app.useBodyParser("urlencoded", { extended: true, limit: "1mb" });
  return app;
}
