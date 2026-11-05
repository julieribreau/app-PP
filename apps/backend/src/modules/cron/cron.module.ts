import { Module } from "@nestjs/common";
import { LoggerModule } from "nestjs-pino";

import { loggerParams } from "../../common/logger.params";
import { HealthModule } from "../health/health.module";
import { QueueModule } from "../queue/queue.module";
import { CronSchedulerService } from "./services/cron-scheduler.service";
import { CronWorker } from "./workers/cron.worker";

/**
 * Module CRON — process séparé (cron/main.ts, replicas: 1), jamais importé par l'API.
 * Pose les planifications BullMQ (`upsertJobScheduler`, cf schedules.ts) et fait tourner
 * les workers ; la logique vit dans les modules métier qu'il importe (RetentionModule,
 * OutboxModule…), il ne fait pas le travail lui-même (skill job-queues §2, §6).
 */
@Module({
  imports: [
    LoggerModule.forRoot(loggerParams("cron")), // Pino : cron/main.ts le récupère par app.get(Logger)
    // /v1/health et /v1/health/ready sur CRON_HEALTH_PORT : même contrat que l'API, lu
    // par le healthcheck Docker du service `cron`.
    HealthModule.forRoot({ service: "cron" }),
    QueueModule,
    // RetentionModule, OutboxModule, NotificationsModule…
  ],
  providers: [CronSchedulerService, CronWorker],
})
export class CronModule {}
