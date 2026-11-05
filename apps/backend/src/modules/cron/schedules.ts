import type { Queue } from "bullmq";

/**
 * Tâches récurrentes du projet (skill job-queues §6), déclarées en code, posées dans BullMQ
 * au démarrage du process cron. Heure du conteneur : UTC ; écrire l'heure UTC et commenter
 * l'heure de Paris, que le passage à l'heure d'été décale d'une heure.
 *
 * Chaque identifiant a son traitement dans `CronWorker` (workers/cron.worker.ts) : une tâche
 * qui concerne tous les tenants y pose un job par tenant actif, au lieu de boucler.
 */
export type Schedule = { id: string; pattern: string } | { id: string; every: number };

/** Nom de la file des tâches planifiées. */
export const CRON_QUEUE = "cron";

export const SCHEDULES: readonly Schedule[] = [
  // { id: "retention.run", pattern: "0 2 * * *" }, // 2 h UTC, 3 h ou 4 h à Paris (purges RGPD)
  // { id: "outbox.relay", every: 5_000 },          // relève de l'outbox
];

/** Ce dont la synchronisation a besoin d'une `Queue` BullMQ : de quoi la tester sans Redis. */
export type SchedulerQueue = Pick<
  Queue,
  "getJobSchedulers" | "removeJobScheduler" | "upsertJobScheduler"
>;

/**
 * Pose chaque planification par `upsertJobScheduler` (identifiant fixe : un redémarrage
 * la met à jour au lieu d'en ajouter une), et retire celles que le code ne déclare plus,
 * sans quoi une tâche retirée du code continuerait de partir.
 */
export async function syncSchedulers(
  queue: SchedulerQueue,
  schedules: readonly Schedule[],
): Promise<void> {
  const declarees = new Set(schedules.map((s) => s.id));
  for (const existante of await queue.getJobSchedulers()) {
    if (!declarees.has(existante.key)) await queue.removeJobScheduler(existante.key);
  }
  for (const s of schedules) {
    const repeat = "pattern" in s ? { pattern: s.pattern } : { every: s.every };
    await queue.upsertJobScheduler(s.id, repeat, {
      name: s.id,
      data: {},
      opts: { removeOnComplete: 100, removeOnFail: 100 },
    });
  }
}
