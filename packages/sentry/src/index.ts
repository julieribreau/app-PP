// Point d'entrée Node (API, cron), compilé dans dist/. Le web et le mobile importent
// les sous-chemins `./scrub`, `./strip-query`, `./data-collection`, en source :
// rien de `@sentry/node` n'entre ainsi dans leurs bundles.
// `flush` : à attendre avant de quitter un process court (script, test) pour ne rien perdre.
export { captureException, flush } from "@sentry/node";
export { captureHttpException, type HttpExceptionContext } from "./capture-http";
export { SANS_DONNEES_PERSONNELLES, type DataCollection } from "./data-collection";
export { initSentry } from "./init-sentry";
export { scrubEvent } from "./scrub";
export { loadSentryConfig, sentryConfigSchema, type SentryConfig } from "./sentry-config";
export { scrubSpan, stripQueryStrings, withoutQuery } from "./strip-query";
