"use client";

import * as React from "react";

import { useConsentContext } from "../ConsentProvider";
import type { ConsentCopy } from "../copy";

export interface ConsentBannerProps {
  readonly copy: ConsentCopy;
  /** Page de la politique cookies, dans la langue courante. */
  readonly policyHref?: string;
}

/**
 * Bandeau du premier passage, tant qu'aucun choix ne vaut. Fenêtre NON modale : la page reste
 * lisible et utilisable (rien n'est mesuré tant qu'il n'y a pas de oui), donc pas de piège au
 * clavier. Il prend le focus en apparaissant, pour qu'un usager au clavier ou au lecteur d'écran
 * l'entende sans traverser la page, et le rend ensuite là où il était.
 * « Refuser » et « Accepter » ont la même forme et le même poids.
 */
export function ConsentBanner({ copy, policyHref }: ConsentBannerProps): React.JSX.Element | null {
  const { ready, record, managerOpen, acceptAll, rejectAll, openManager } = useConsentContext();
  const titleId = React.useId();
  const bodyId = React.useId();
  const ref = React.useRef<HTMLDivElement>(null);
  const visible = ready && record === null && !managerOpen;

  React.useEffect(() => {
    if (!visible) return;
    const previous = document.activeElement;
    ref.current?.focus();
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      tabIndex={-1}
      className="consent-banner"
    >
      <h2 id={titleId} className="consent-title">
        {copy.banner.title}
      </h2>
      <p id={bodyId} className="consent-text">
        {copy.banner.body}
        {policyHref ? (
          <>
            {" "}
            <a href={policyHref}>{copy.banner.policy}</a>
          </>
        ) : null}
      </p>
      <div className="consent-actions">
        <button type="button" className="consent-button" onClick={rejectAll}>
          {copy.banner.reject}
        </button>
        <button type="button" className="consent-button" onClick={acceptAll}>
          {copy.banner.accept}
        </button>
        <button
          type="button"
          className="consent-button consent-button--outline"
          onClick={openManager}
        >
          {copy.banner.customize}
        </button>
      </div>
    </div>
  );
}
