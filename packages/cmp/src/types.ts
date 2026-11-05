import { z } from "zod";

/** Une finalité présentée à l'usager. `required` : strictement nécessaire, ni refusable ni datée. */
export interface ConsentPurpose {
  readonly id: string;
  readonly required?: boolean;
}

/**
 * Ce qui peut varier d'un tenant à l'autre : la liste des finalités, la version de la politique
 * cookies et la clé de stockage. Les textes passent à part (`ConsentCopy`).
 */
export interface ConsentConfig {
  /** Version de la politique cookies : la changer redemande le choix à tous les usagers. */
  readonly version: string;
  readonly purposes: readonly ConsentPurpose[];
  /** Durée de validité d'un choix, puis il est redemandé : 13 mois au plus (politique cookies). */
  readonly maxAgeMonths: number;
  /** Clé du stockage local : une par tenant quand plusieurs tenants partagent une origine. */
  readonly storageKey: string;
}

export const DEFAULT_CONSENT_CONFIG: ConsentConfig = {
  version: "1",
  purposes: [{ id: "essential", required: true }, { id: "analytics" }],
  maxAgeMonths: 13,
  storageKey: "consent",
};

/**
 * La preuve du choix, gardée sur l'appareil : quelles finalités ont été présentées, ce qui a été
 * répondu, quand, et sous quelle version de la politique.
 */
export const ConsentRecordSchema = z.object({
  version: z.string().min(1),
  /** Finalités facultatives présentées au moment du choix : une nouvelle finalité le périme. */
  purposes: z.array(z.string()),
  choices: z.record(z.string(), z.boolean()),
  decidedAt: z.iso.datetime(),
  /** Date de la dernière réponse à chaque finalité, affichée dans le gestionnaire. */
  choiceDates: z.record(z.string(), z.iso.datetime()),
});
export type ConsentRecord = z.infer<typeof ConsentRecordSchema>;

/** Réponse par finalité facultative : `true` accepté, `false` ou absent refusé. */
export type ConsentChoices = Readonly<Record<string, boolean>>;
