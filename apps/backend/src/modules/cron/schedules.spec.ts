import { describe, expect, it, vi } from "vitest";

import { type SchedulerQueue, syncSchedulers } from "./schedules";

function fausseFile(existantes: string[]) {
  const queue = {
    getJobSchedulers: vi.fn().mockResolvedValue(existantes.map((key) => ({ key }))),
    removeJobScheduler: vi.fn().mockResolvedValue(true),
    upsertJobScheduler: vi.fn().mockResolvedValue(undefined),
  };
  return { queue, file: queue as unknown as SchedulerQueue };
}

describe("syncSchedulers", () => {
  it("pose chaque planification déclarée sous son identifiant fixe", async () => {
    const { queue, file } = fausseFile([]);

    await syncSchedulers(file, [
      { id: "retention.run", pattern: "0 2 * * *" },
      { id: "outbox.relay", every: 5_000 },
    ]);

    expect(queue.upsertJobScheduler).toHaveBeenCalledWith(
      "retention.run",
      { pattern: "0 2 * * *" },
      { name: "retention.run", data: {}, opts: { removeOnComplete: 100, removeOnFail: 100 } },
    );
    expect(queue.upsertJobScheduler).toHaveBeenCalledWith(
      "outbox.relay",
      { every: 5_000 },
      expect.objectContaining({ name: "outbox.relay" }),
    );
  });

  it("retire une planification que le code ne déclare plus, et garde les autres", async () => {
    // Sans ce retrait, une tâche supprimée du code continuerait de partir.
    const { queue, file } = fausseFile(["retention.run", "ancienne.tache"]);

    await syncSchedulers(file, [{ id: "retention.run", pattern: "0 2 * * *" }]);

    expect(queue.removeJobScheduler).toHaveBeenCalledTimes(1);
    expect(queue.removeJobScheduler).toHaveBeenCalledWith("ancienne.tache");
  });

  it("une liste vide retire tout et ne pose rien", async () => {
    const { queue, file } = fausseFile(["a", "b"]);

    await syncSchedulers(file, []);

    expect(queue.removeJobScheduler).toHaveBeenCalledTimes(2);
    expect(queue.upsertJobScheduler).not.toHaveBeenCalled();
  });
});
