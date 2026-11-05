import { Inject, Injectable, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { captureException } from "@nutrion/sentry";
import { type Job, Worker } from "bullmq";
import type { Redis } from "ioredis";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";

import { QUEUE_CONNECTION, QUEUE_PREFIX } from "../../queue/queue.module";
import { CRON_QUEUE } from "../schedules";

/**
 * Worker des tâches planifiées (skill job-queues §5) : dans le process cron, jamais dans
 * l'API. Il n'appelle que le service du module métier, qui porte la logique.
 */
@Injectable()
export class CronWorker implements OnModuleInit, OnModuleDestroy {
  private worker?: Worker;

  /** Un traitement par identifiant de `SCHEDULES`. */
  private readonly handlers: Record<string, () => Promise<unknown>> = {
    // "retention.run": () => this.retention.runOnce(),
  };

  constructor(
    @Inject(QUEUE_CONNECTION) private readonly connection: Redis,
    @InjectPinoLogger(CronWorker.name) private readonly logger: PinoLogger,
  ) {}

  onModuleInit() {
    this.worker = new Worker(CRON_QUEUE, (job) => this.process(job), {
      connection: this.connection,
      prefix: QUEUE_PREFIX,
      concurrency: 1,
    });
    this.worker.on("failed", (job, err) => this.onFailed(job, err));
  }

  // SIGTERM (redéploiement) : laisse finir le job en cours au lieu de le couper au milieu.
  async onModuleDestroy() {
    await this.worker?.close();
    this.logger.info({ event: "cron.worker.closed" }, "worker arrêté");
  }

  /** Exposée pour les tests : un faux `Job` suffit. */
  async process(job: Pick<Job, "id" | "name">) {
    const handler = this.handlers[job.name];
    if (!handler) throw new Error(`tâche planifiée sans traitement : ${job.name}`);
    const started = Date.now();
    this.logger.info({ event: `cron.${job.name}.started`, trace_id: job.id }, "tâche démarrée");
    await handler();
    this.logger.info(
      { event: `cron.${job.name}.done`, trace_id: job.id, duration_ms: Date.now() - started },
      "tâche terminée",
    );
  }

  private onFailed(job: Job | undefined, err: Error) {
    const terminal = !!job && job.attemptsMade >= (job.opts.attempts ?? 1);
    if (!terminal) {
      this.logger.warn(
        { event: `cron.${job?.name}.retry`, trace_id: job?.id, err },
        "tâche relancée",
      );
      return;
    }
    this.logger.error(
      { event: `cron.${job.name}.failed`, trace_id: job.id, err },
      "tâche en échec",
    );
    // Sentry à l'échec terminal seulement (skill error-tracking §4).
    captureException(err, { tags: { subsystem: `job-${job.name}` } });
  }
}
