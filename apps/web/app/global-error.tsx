"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Dernière limite d'erreur, celle du layout racine lui-même : Next la rend à la place de
// toute la page, sans layout ni fournisseur de traductions (d'où le texte bilingue en dur,
// seule exception à la règle des clés i18n). L'erreur part dans Sentry.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="fr">
      <body>
        <main>
          <h1>Une erreur est survenue.</h1>
          <p lang="en">An error occurred.</p>
        </main>
      </body>
    </html>
  );
}
