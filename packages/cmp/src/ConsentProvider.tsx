"use client";

import * as React from "react";

import { allChoices, createRecord, isGranted } from "./record";
import { readRecord, writeRecord, type KeyValueStore } from "./storage";
import {
  DEFAULT_CONSENT_CONFIG,
  type ConsentChoices,
  type ConsentConfig,
  type ConsentRecord,
} from "./types";

export interface ConsentContextValue {
  readonly config: ConsentConfig;
  /** Le stockage a été lu : avant, ni bandeau ni mesure. */
  readonly ready: boolean;
  /** Le choix en vigueur ; `null` tant qu'il n'y en a pas (ou plus) : le bandeau s'affiche. */
  readonly record: ConsentRecord | null;
  isGranted(purposeId: string): boolean;
  acceptAll(): void;
  rejectAll(): void;
  save(choices: ConsentChoices): void;
  /** Gestionnaire web : ouvert par « Personnaliser » ou par le lien « Gérer mes cookies ». */
  readonly managerOpen: boolean;
  openManager(): void;
  /** Fermer sans avoir jamais choisi vaut refus (politique cookies §6). */
  closeManager(): void;
}

const ConsentContext = React.createContext<ConsentContextValue | null>(null);

export interface ConsentProviderProps {
  /**
   * Finalités et version de la politique du tenant ; défaut : essentiel et mesure d'audience.
   * Stables d'un rendu à l'autre (constante de module, `useMemo`) : les changer relit le stockage.
   */
  readonly config?: ConsentConfig;
  readonly store: KeyValueStore;
  /**
   * Chaque choix, une fois stocké : l'app peut le tracer côté serveur par son port d'API
   * (compte connecté, brique rgpd-droits-personnes). Le paquet ne connaît pas l'API.
   */
  readonly onChange?: (record: ConsentRecord) => void;
  /** Horloge, remplacée en test. */
  readonly now?: () => Date;
  readonly children: React.ReactNode;
}

export function ConsentProvider(props: ConsentProviderProps): React.JSX.Element {
  const { config = DEFAULT_CONSENT_CONFIG, store, onChange, now = defaultNow, children } = props;
  const [ready, setReady] = React.useState(false);
  const [record, setRecord] = React.useState<ConsentRecord | null>(null);
  const [managerOpen, setManagerOpen] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    void readRecord(store, config, now()).then((stored) => {
      if (cancelled) return;
      setRecord(stored);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [store, config, now]);

  const decide = React.useCallback(
    (choices: ConsentChoices) => {
      const next = createRecord(config, choices, now(), record);
      setRecord(next);
      setManagerOpen(false);
      void writeRecord(store, config, next).then(() => onChange?.(next));
    },
    [config, now, record, store, onChange],
  );

  const value = React.useMemo<ConsentContextValue>(
    () => ({
      config,
      ready,
      record,
      isGranted: (purposeId) => isGranted(record, config, purposeId),
      acceptAll: () => decide(allChoices(config, true)),
      rejectAll: () => decide(allChoices(config, false)),
      save: decide,
      managerOpen,
      openManager: () => setManagerOpen(true),
      closeManager: () => {
        if (record === null) decide(allChoices(config, false));
        else setManagerOpen(false);
      },
    }),
    [config, ready, record, decide, managerOpen],
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

function defaultNow(): Date {
  return new Date();
}

export function useConsentContext(): ConsentContextValue {
  const context = React.useContext(ConsentContext);
  if (!context) throw new Error("useConsentContext : à rendre sous <ConsentProvider>");
  return context;
}

/** `true` seulement si l'usager a accepté cette finalité (ou si elle est strictement nécessaire). */
export function useConsent(purposeId: string): boolean {
  return useConsentContext().isGranted(purposeId);
}
