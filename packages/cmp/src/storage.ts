import { isCurrent } from "./record";
import { ConsentRecordSchema, type ConsentConfig, type ConsentRecord } from "./types";

/**
 * Ce que le gestionnaire attend d'un stockage : `localStorage` sur le web, AsyncStorage sur
 * mobile, une Map en test. Synchrone ou non, les deux conviennent.
 */
export interface KeyValueStore {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
}

/**
 * Le choix stocké, s'il vaut encore. Illisible, d'une autre version, d'une autre liste de
 * finalités ou expiré : `null`, et le bandeau revient.
 */
export async function readRecord(
  store: KeyValueStore,
  config: ConsentConfig,
  now: Date,
): Promise<ConsentRecord | null> {
  try {
    const raw = await store.getItem(config.storageKey);
    if (!raw) return null;
    const parsed = ConsentRecordSchema.safeParse(JSON.parse(raw));
    if (!parsed.success || !isCurrent(parsed.data, config, now)) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

// Navigation privée de Safari, stockage bloqué, quota plein : le choix s'applique quand même
// pour la session, il ne sera simplement pas retenu.
export async function writeRecord(
  store: KeyValueStore,
  config: ConsentConfig,
  record: ConsentRecord,
): Promise<void> {
  try {
    await store.setItem(config.storageKey, JSON.stringify(record));
  } catch {
    /* stockage indisponible : choix non retenu, sans erreur pour l'usager */
  }
}

/** `localStorage` du navigateur, lu à la demande : rien n'y touche pendant le rendu serveur. */
export function browserStore(): KeyValueStore {
  const storage = (): Storage | undefined =>
    typeof window === "undefined" ? undefined : window.localStorage;
  return {
    getItem: (key) => storage()?.getItem(key) ?? null,
    setItem: (key, value) => storage()?.setItem(key, value),
  };
}

/** Stockage en mémoire : tests, et page sans stockage persistant. */
export function memoryStore(initial: Record<string, string> = {}): KeyValueStore {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
  };
}
