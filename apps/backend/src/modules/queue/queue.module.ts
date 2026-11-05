import { Inject, Module, type OnApplicationShutdown } from "@nestjs/common";
import { Redis } from "ioredis";

import { loadEnv } from "../../config/env";

/**
 * Connexion BullMQ (skill job-queues §3), distincte du client de cache : BullMQ exige
 * `maxRetriesPerRequest: null` (ses commandes bloquantes attendent la reconnexion), le
 * cache veut l'inverse (échouer vite). Un seul client pour les deux casse l'un ou l'autre.
 * REDIS_URL est requise au boot : sans Redis, rien ne tourne, et rien ne le dirait.
 */
export const QUEUE_CONNECTION = Symbol("QUEUE_CONNECTION");
/** Préfixe de chaque file : un même Redis ne mélange pas les files de deux projets. */
export const QUEUE_PREFIX = "nutrion-app";

@Module({
  providers: [
    {
      provide: QUEUE_CONNECTION,
      useFactory: () => new Redis(loadEnv().REDIS_URL, { maxRetriesPerRequest: null }),
    },
  ],
  exports: [QUEUE_CONNECTION],
})
export class QueueModule implements OnApplicationShutdown {
  constructor(@Inject(QUEUE_CONNECTION) private readonly connection: Redis) {}

  // Après les onModuleDestroy : workers et files sont déjà fermés quand la connexion part.
  async onApplicationShutdown() {
    await this.connection.quit();
  }
}
