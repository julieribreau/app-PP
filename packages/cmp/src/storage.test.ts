import { describe, expect, it } from "vitest";

import { createRecord } from "./record";
import { memoryStore, readRecord, writeRecord, type KeyValueStore } from "./storage";
import { DEFAULT_CONSENT_CONFIG as config } from "./types";

const now = new Date("2026-10-05T10:00:00.000Z");

describe("stockage de la preuve", () => {
  it("relit le choix écrit, avec sa date et sa version", async () => {
    const store = memoryStore();
    const record = createRecord(config, { analytics: true }, now, null);
    await writeRecord(store, config, record);

    expect(JSON.parse(String(await store.getItem("consent")))).toMatchObject({
      version: "1",
      decidedAt: now.toISOString(),
      choices: { analytics: true },
    });
    await expect(readRecord(store, config, now)).resolves.toEqual(record);
  });

  it("ignore un contenu illisible ou d'un autre format", async () => {
    await expect(readRecord(memoryStore({ consent: "{ pas du json" }), config, now)).resolves.toBe(
      null,
    );
    const wrongShape = memoryStore({ consent: JSON.stringify({ analytics: true }) });
    await expect(readRecord(wrongShape, config, now)).resolves.toBeNull();
  });

  it("ignore un choix périmé : il sera redemandé", async () => {
    const store = memoryStore();
    await writeRecord(store, config, createRecord(config, { analytics: true }, now, null));
    await expect(readRecord(store, { ...config, version: "2" }, now)).resolves.toBeNull();
    await expect(readRecord(store, config, new Date("2028-01-01T00:00:00.000Z"))).resolves.toBe(
      null,
    );
  });

  it("un stockage qui lève (navigation privée) ne casse rien", async () => {
    const broken: KeyValueStore = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => Promise.reject(new Error("QuotaExceededError")),
    };
    await expect(readRecord(broken, config, now)).resolves.toBeNull();
    await expect(
      writeRecord(broken, config, createRecord(config, {}, now, null)),
    ).resolves.toBeUndefined();
  });
});
