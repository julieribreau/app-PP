"use client";

import * as React from "react";

import { useConsentContext } from "../ConsentProvider";
import { purposeText, withDate, type ConsentCopy } from "../copy";
import type { ConsentChoices, ConsentPurpose, ConsentRecord } from "../types";

export interface ConsentManagerProps {
  readonly copy: ConsentCopy;
  /** Langue de la page, pour les dates. */
  readonly locale: string;
}

/**
 * Gestionnaire « Gérer mes cookies » : une finalité par ligne, et le choix se valide. Fenêtre
 * modale native (`showModal`) : le navigateur piège le focus dedans, rend le reste de la page
 * inerte et ferme à Échap ; à la fermeture, le focus revient à ce qui l'a ouverte.
 */
export function ConsentManager({ copy, locale }: ConsentManagerProps): React.JSX.Element | null {
  const { managerOpen } = useConsentContext();
  return managerOpen ? <ManagerDialog copy={copy} locale={locale} /> : null;
}

function ManagerDialog({ copy, locale }: ConsentManagerProps): React.JSX.Element {
  const { config, record, save, acceptAll, rejectAll, closeManager } = useConsentContext();
  const [draft, setDraft] = React.useState<ConsentChoices>(() => ({ ...record?.choices }));
  const ref = React.useRef<HTMLDialogElement>(null);
  const titleId = React.useId();

  React.useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement;
    // Un environnement sans `showModal` (jsdom) l'ouvre au moins, sans le piège de focus.
    if (dialog && typeof dialog.showModal === "function") dialog.showModal();
    else dialog?.setAttribute("open", "");
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);

  const onCancel = (event: React.SyntheticEvent) => {
    event.preventDefault(); // Échap : la fermeture passe par l'état, pas par le navigateur seul
    closeManager();
  };

  return (
    <dialog ref={ref} aria-labelledby={titleId} className="consent-manager" onCancel={onCancel}>
      <h2 id={titleId} className="consent-title">
        {copy.manager.title}
      </h2>
      <p className="consent-text">{copy.manager.intro}</p>
      {record ? (
        <p className="consent-text consent-muted">
          {withDate(copy.manager.savedOn, record.decidedAt, locale)}
        </p>
      ) : null}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save(draft);
        }}
      >
        <ul className="consent-purposes">
          {config.purposes.map((purpose) => (
            <PurposeRow
              key={purpose.id}
              purpose={purpose}
              copy={copy}
              locale={locale}
              record={record}
              checked={draft[purpose.id] === true}
              onToggle={(value) => setDraft((current) => ({ ...current, [purpose.id]: value }))}
            />
          ))}
        </ul>
        <div className="consent-actions">
          <button type="button" className="consent-button" onClick={rejectAll}>
            {copy.manager.rejectAll}
          </button>
          <button type="button" className="consent-button" onClick={acceptAll}>
            {copy.manager.acceptAll}
          </button>
          <button type="submit" className="consent-button consent-button--outline">
            {copy.manager.save}
          </button>
        </div>
      </form>
      <button type="button" className="consent-close" onClick={closeManager}>
        {copy.manager.close}
      </button>
    </dialog>
  );
}

interface PurposeRowProps {
  readonly purpose: ConsentPurpose;
  readonly copy: ConsentCopy;
  readonly locale: string;
  readonly record: ConsentRecord | null;
  readonly checked: boolean;
  readonly onToggle: (value: boolean) => void;
}

// Une finalité strictement nécessaire n'a pas de case : une case grisée se lit mal au lecteur
// d'écran, une mention « toujours actifs » se lit bien.
function PurposeRow(props: PurposeRowProps): React.JSX.Element {
  const { purpose, copy, locale, record, checked, onToggle } = props;
  const inputId = React.useId();
  const descriptionId = React.useId();
  const text = purposeText(copy, purpose.id);
  const decidedOn = record?.choiceDates[purpose.id];
  const template = record?.choices[purpose.id] ? copy.manager.acceptedOn : copy.manager.refusedOn;
  return (
    <li className="consent-purpose">
      <div className="consent-purpose-head">
        {purpose.required ? (
          <>
            <span className="consent-purpose-label">{text.label}</span>
            <span className="consent-muted">{copy.manager.required}</span>
          </>
        ) : (
          <>
            <label htmlFor={inputId} className="consent-purpose-label">
              {text.label}
            </label>
            <input
              id={inputId}
              type="checkbox"
              className="consent-checkbox"
              checked={checked}
              aria-describedby={descriptionId}
              onChange={(event) => onToggle(event.target.checked)}
            />
          </>
        )}
      </div>
      <p id={descriptionId} className="consent-text consent-muted">
        {text.description}
        {decidedOn && !purpose.required ? ` ${withDate(template, decidedOn, locale)}` : null}
      </p>
    </li>
  );
}
