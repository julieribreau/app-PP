// Ce que le filtre d'exception global d'une API NestJS envoie à Sentry.
//
// Une fonction plutôt qu'un second filtre : le filtre de l'application rend la réponse
// (problem+json), et Nest n'applique qu'un seul filtre `@Catch()` global par exception.
// La règle de capture vit ici, testée une fois, pour l'API comme pour un futur service.
import * as Sentry from "@sentry/node";

import { withoutQuery } from "./strip-query";

/**
 * Les routes de santé répondent 503 dès qu'une dépendance tombe, sondées en boucle par
 * Gatus et Docker : un signal d'exploitation, pas une erreur à suivre (sinon, une
 * dépendance tombée remplit le quota en une heure).
 */
const ROUTE_DE_SANTE = /\/(health|ready)(\/|$)/;

export interface HttpExceptionContext {
  status: number;
  /** URL de la requête, telle que l'adaptateur HTTP la donne (chaîne de requête comprise). */
  url?: string;
  /** Identifiant de requête des logs, pour retrouver les lignes de la même requête. */
  traceId?: string;
}

/** Envoie à Sentry une exception de statut ≥ 500, hors routes de santé. Dit si elle est partie. */
export function captureHttpException(exception: unknown, context: HttpExceptionContext): boolean {
  if (context.status < 500) return false;
  if (ROUTE_DE_SANTE.test(withoutQuery(context.url ?? ""))) return false;
  Sentry.captureException(exception, {
    tags: { subsystem: "http", ...(context.traceId ? { trace_id: context.traceId } : {}) },
  });
  return true;
}
