// Sentry côté serveur Next (runtimes nodejs et edge), chargé par instrumentation.ts.
import * as Sentry from "@sentry/nextjs";
import { SANS_DONNEES_PERSONNELLES } from "@nutrion/sentry/data-collection";
import { scrubEvent } from "@nutrion/sentry/scrub";
import { scrubSpan, stripQueryStrings } from "@nutrion/sentry/strip-query";

// NEXT_PUBLIC_APP_ENV, figé au build (cd.yml) : l'image web est construite par environnement.
const environment = process.env["NEXT_PUBLIC_APP_ENV"] || "development";

Sentry.init({
  dsn: process.env["SENTRY_DSN"],
  environment,
  // Le tag de l'image (sha-<hexa>), posé par cd.yml au build.
  release: process.env["RELEASE"] || undefined,
  tracesSampleRate: environment === "production" ? 0.1 : 0,
  // Déclaré et non hérité : depuis la 11, le défaut du SDK collecte tout.
  dataCollection: SANS_DONNEES_PERSONNELLES,
  initialScope: { tags: { app: "web", env: environment } },
  beforeSend: (event) => stripQueryStrings(scrubEvent(event)),
  beforeSendTransaction: stripQueryStrings,
  beforeSendSpan: scrubSpan,
});
