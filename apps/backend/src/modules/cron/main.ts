import "./instrument";
import { NestFactory } from "@nestjs/core";
import { Logger } from "nestjs-pino";

import { HttpExceptionFilter } from "../../common/http-exception.filter";
import { loadEnv } from "../../config/env";
import { CronModule } from "./cron.module";

/**
 * Entrypoint du PROCESS CRON — séparé de l'API (cf socle §Crons, architecture-reference).
 * Déployé en replicas: 1 (un seul ordonnanceur). Ne JAMAIS démarrer planifications ni
 * workers dans l'API. Même image que l'API : `node dist/modules/cron/main.js`.
 *
 * Un serveur HTTP réduit à la santé (pas de contrôleur métier), sur son propre port :
 * le healthcheck Docker et la supervision lisent le même contrat que pour l'API.
 */
async function bootstrap() {
  const env = loadEnv();
  const app = await NestFactory.create(CronModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.setGlobalPrefix("v1");
  app.useGlobalFilters(new HttpExceptionFilter());
  // SIGTERM (redéploiement) : workers fermés après leur job en cours, files et connexions
  // fermées ensuite (onModuleDestroy, puis onApplicationShutdown).
  app.enableShutdownHooks();
  await app.listen(env.CRON_HEALTH_PORT);
}
void bootstrap();
