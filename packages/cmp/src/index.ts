// Gestion du consentement, partagée par le web et le mobile : état, preuve stockée, règles de
// validité (version, finalités, expiration). Les écrans sont dans `./web` et `./native`.
export { ConsentProvider, useConsent, useConsentContext } from "./ConsentProvider";
export type { ConsentContextValue, ConsentProviderProps } from "./ConsentProvider";
export { purposeText, withDate } from "./copy";
export type { ConsentCopy } from "./copy";
export {
  allChoices,
  createRecord,
  expiresAt,
  isCurrent,
  isGranted,
  optionalPurposes,
} from "./record";
export { browserStore, memoryStore, readRecord, writeRecord } from "./storage";
export type { KeyValueStore } from "./storage";
export { ConsentRecordSchema, DEFAULT_CONSENT_CONFIG } from "./types";
export type { ConsentChoices, ConsentConfig, ConsentPurpose, ConsentRecord } from "./types";
