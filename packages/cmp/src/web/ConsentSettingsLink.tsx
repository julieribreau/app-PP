"use client";

import * as React from "react";

import { useConsentContext } from "../ConsentProvider";

/** « Gérer mes cookies », en pied de chaque page : rouvre le gestionnaire à tout moment. */
export function ConsentSettingsLink({ label }: { readonly label: string }): React.JSX.Element {
  const { openManager } = useConsentContext();
  return (
    <button type="button" className="consent-link" onClick={openManager}>
      {label}
    </button>
  );
}
