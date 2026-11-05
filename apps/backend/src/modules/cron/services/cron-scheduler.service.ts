import {
  Inject,
  Injectable,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from "@nestjs/common";
import { Queue } from "bullmq";
import type { Redis } from "ioredis";

import { QUEUE_CONNECTION, QUEUE_PREFIX } from "../../queue/queue.module";
import { CRON_QUEUE, SCHEDULES, syncSchedulers } from "../schedules";

/**
 * Pose les planifications au démarrage du process cron, seul et unique (replicas: 1) :
 * BullMQ répartit les jobs entre workers, pas les planifications entre ordonnanceurs.
 */
@Injectable()
export class CronSchedulerService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly queue: Queue;

  constructor(@Inject(QUEUE_CONNECTION) connection: Redis) {
    this.queue = new Queue(CRON_QUEUE, { connection, prefix: QUEUE_PREFIX });
  }

  async onApplicationBootstrap() {
    await syncSchedulers(this.queue, SCHEDULES);
  }

  async onModuleDestroy() {
    await this.queue.close();
  }
}
