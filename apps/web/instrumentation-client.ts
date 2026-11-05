// Sentry navigateur, toujours actif : le suivi des erreurs est nécessaire au service
// (intérêt légitime), pas une mesure d'audience. Le Session Replay, lui, relèverait du
// consentement : il n'est pas activé.
import * as Sentry from "@sentry/nextjs";
import { SANS_DONNEES_PERSONNELLES } from "@nutrion/sentry/data-collection";
import { scrubEvent } from "@nutrion/sentry/scrub";
import { scrubSpan, stripQueryStrings } from "@nutrion/sentry/strip-query";

const dsn = process.env["NEXT_PUBLIC_SENTRY_DSN"];
const environment = process.env["NEXT_PUBLIC_APP_ENV"] || "development";

if (dsn) {
  Sentry.init({
    dsn,
    environment,
    // La release est injectée au build par withSentryConfig (next.config.mjs).
    tracesSampleRate: environment === "production" ? 0.1 : 0,
    dataCollection: SANS_DONNEES_PERSONNELLES,
    initialScope: { tags: { app: "web", env: environment } },
    // L'URL de la page et ce que l'usager saisit passent par ici : c'est le chemin qui fuit.
    beforeSend: (event) => stripQueryStrings(scrubEvent(event)),
    beforeSendTransaction: stripQueryStrings,
    beforeSendSpan: scrubSpan,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
