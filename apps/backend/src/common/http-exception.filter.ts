import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import { Catch, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { captureHttpException, withoutQuery } from "@nutrion/sentry";

const SONDE = /\/health(\/ready)?$/;

interface RequeteVue {
  id?: string | number;
  method?: string;
  url?: string;
}

/**
 * Exception filter global — réponses d'erreur normalisées (problem+json), jamais de stack
 * trace en clair côté client. Un 5xx part dans Sentry, hors routes de santé (cf socle
 * §Hardening backend, skill error-tracking §3). Enregistré dans main.ts.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<RequeteVue>();
    const res = ctx.getResponse();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const traceId = req.id === undefined ? undefined : String(req.id);

    if (captureHttpException(exception, { status, url: req.url, traceId })) {
      // Sans cette ligne, un 5xx n'existe que dans Sentry : invisible dès le quota épuisé.
      // Méthode et chemin seulement : ni corps, ni chaîne de requête.
      this.logger.error(
        {
          err: exception,
          trace_id: traceId,
          method: req.method,
          path: withoutQuery(req.url ?? ""),
        },
        `HTTP ${status}`,
      );
    }

    // La sonde de santé (Terminus) répond 503 avec un état par dépendance, déjà épuré :
    // Gatus lit ce corps pour nommer ce qui est tombé, il passe tel quel.
    if (exception instanceof HttpException && SONDE.test(withoutQuery(req.url ?? ""))) {
      res.status(status).json(exception.getResponse());
      return;
    }

    res
      .status(status)
      .type("application/problem+json")
      .send({
        type: "about:blank",
        title: titre(exception, status),
        status,
        // pas de détail interne exposé
      });
  }
}

/** Le message d'une HttpException est écrit pour le client ; celui d'une autre erreur, non. */
function titre(exception: unknown, status: number): string {
  if (exception instanceof HttpException && status < 500) return exception.message;
  return status === 503 ? "Service Unavailable" : "Internal Server Error";
}
