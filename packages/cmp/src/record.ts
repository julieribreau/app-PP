import type { ConsentChoices, ConsentConfig, ConsentRecord } from "./types";

/** Les finalités que l'usager accepte ou refuse, triées : les strictement nécessaires n'en sont pas. */
export function optionalPurposes(config: ConsentConfig): string[] {
  return config.purposes
    .filter((purpose) => !purpose.required)
    .map((purpose) => purpose.id)
    .sort();
}

export function expiresAt(record: ConsentRecord, config: ConsentConfig): Date {
  const date = new Date(record.decidedAt);
  date.setUTCMonth(date.getUTCMonth() + config.maxAgeMonths);
  return date;
}

/**
 * Un choix vaut tant qu'il porte la version courante de la politique, qu'il a vu exactement les
 * finalités d'aujourd'hui et qu'il n'a pas expiré. Sinon le bandeau revient.
 */
export function isCurrent(record: ConsentRecord, config: ConsentConfig, now: Date): boolean {
  if (record.version !== config.version) return false;
  const presented = [...record.purposes].sort();
  const current = optionalPurposes(config);
  if (presented.length !== current.length) return false;
  if (presented.some((id, index) => id !== current[index])) return false;
  return expiresAt(record, config).getTime() > now.getTime();
}

/** Toutes les finalités facultatives à la même valeur : « Tout accepter », « Tout refuser ». */
export function allChoices(config: ConsentConfig, value: boolean): ConsentChoices {
  return Object.fromEntries(optionalPurposes(config).map((id) => [id, value]));
}

/**
 * Le nouveau choix. Une finalité dont la réponse ne change pas garde sa date : « accepté le … »
 * dit quand l'usager a dit oui, pas quand il a revu l'écran.
 */
export function createRecord(
  config: ConsentConfig,
  choices: ConsentChoices,
  now: Date,
  previous: ConsentRecord | null,
): ConsentRecord {
  const decidedAt = now.toISOString();
  const purposes = optionalPurposes(config);
  const resolved: Record<string, boolean> = {};
  const choiceDates: Record<string, string> = {};
  for (const id of purposes) {
    const value = choices[id] === true;
    resolved[id] = value;
    const unchanged = previous?.choices[id] === value;
    choiceDates[id] = (unchanged ? previous?.choiceDates[id] : undefined) ?? decidedAt;
  }
  return { version: config.version, purposes, choices: resolved, decidedAt, choiceDates };
}

/** Une finalité strictement nécessaire est toujours active ; les autres attendent un oui. */
export function isGranted(
  record: ConsentRecord | null,
  config: ConsentConfig,
  purposeId: string,
): boolean {
  const purpose = config.purposes.find((candidate) => candidate.id === purposeId);
  if (purpose?.required) return true;
  return record?.choices[purposeId] === true;
}
