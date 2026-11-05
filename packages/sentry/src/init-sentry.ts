// Sentry pour les process Node (API, cron) : à appeler AVANT `NestFactory.create()`
// pour que l'auto-instrumentation HTTP capture les requêtes dès la première seconde.
// Tags posés sur chaque événement : `app` (process émetteur) et `env`.
import * as Sentry from "@sentry/node";

import { SANS_DONNEES_PERSONNELLES } from "./data-collection";
import { scrubEvent } from "./scrub";
import { loadSentryConfig } from "./sentry-config";
import { scrubSpan, stripQueryStrings } from "./strip-query";

/** Réponses prévisibles d'une API : jamais des erreurs à suivre. */
const EXPECTED_HTTP_STATUSES = new Set([400, 401, 403, 404, 409, 422, 429]);

/**
 * Plafond d'événements par jour et par process.
 *
 * Le quota d'erreurs Sentry est mensuel et commun à toute l'organisation, sans plafond
 * par projet ni par clé. Le seul garde-fou est donc côté émetteur : une erreur rejouée
 * à chaque chargement de page (une violation CSP, par exemple) épuise le quota du mois
 * en une journée et rend tous les projets aveugles jusqu'au mois suivant.
 *
 * ponytail: compteur en mémoire, par process, remis à zéro au changement de jour UTC.
 * Avec N instances le plafond effectif est N x 150 : relever le budget par
 * SENTRY_DAILY_EVENT_BUDGET, ou passer à un compteur Redis partagé si l'API monte
 * au-delà de quelques réplicas.
 */
const DAILY_EVENT_BUDGET = Number(process.env["SENTRY_DAILY_EVENT_BUDGET"] ?? 150);

let budgetDay = "";
let sentToday = 0;

/** Exportée pour le test de non-régression du plafond. */
export function withinDailyBudget(): boolean {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== budgetDay) {
    budgetDay = today;
    sentToday = 0;
  }
  if (sentToday >= DAILY_EVENT_BUDGET) return false;
  sentToday += 1;
  return true;
}

/** `appTag` identifie le process émetteur dans Sentry (tag `app`). Sans DSN (dev local), rien. */
export function initSentry(options: { appTag: string }): void {
  const { dsn, environment, release } = loadSentryConfig();
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment,
    release,
    tracesSampleRate: environment === "production" ? 0.1 : 0,
    // Déclaré et non hérité : depuis la 11, le défaut du SDK collecte tout
    // (utilisateur, IP, cookies, en-têtes, corps). Cf `data-collection.ts`.
    dataCollection: SANS_DONNEES_PERSONNELLES,
    initialScope: { tags: { app: options.appTag, env: environment } },
    beforeSend(event, hint) {
      const status = (hint?.originalException as { status?: number } | undefined)?.status;
      if (typeof status === "number" && EXPECTED_HTTP_STATUSES.has(status)) return null;
      if (!withinDailyBudget()) return null;
      // `dataCollection` ne protège pas de ce que NOTRE code met dans un message ou
      // un fil d'Ariane (cf `scrub.ts`), ni des chaînes de requête d'URL (cf `strip-query.ts`).
      return stripQueryStrings(scrubEvent(event));
    },
    // En 11, `beforeSendTransaction` ne sert qu'en `traceLifecycle: 'static'` ; les
    // spans passent par `beforeSendSpan`.
    beforeSendTransaction: stripQueryStrings,
    beforeSendSpan: scrubSpan,
  });
}
