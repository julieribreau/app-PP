import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import { Catch, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { captureHttpException, withoutQuery } from "@nutrion/sentry";
import { ZodValidationException } from "nestjs-zod";

const SONDE = /\/health(\/ready)?$/;

interface RequeteVue {
  id?: string | number;
  method?: string;
  url?: string;
}

/** Code stable déduit du statut quand l'exception n'en porte pas. */
const CODES: Record<number, string> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  413: "PAYLOAD_TOO_LARGE",
  415: "UNSUPPORTED_MEDIA_TYPE",
  422: "UNPROCESSABLE_ENTITY",
  429: "TOO_MANY_REQUESTS",
  503: "SERVICE_UNAVAILABLE",
};

/**
 * Exception filter global : réponses d'erreur au format du contrat d'API
 * `{ statusCode, code, message }`, jamais de stack trace côté client. Un 5xx part dans
 * Sentry, hors routes de santé (socle §Hardening backend, skill error-tracking §3).
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

    res.status(status).json(corps(exception, status));
  }
}

/** Le code porté par l'exception (AppError, Better Auth), sinon celui du statut. */
function codeOf(exception: HttpException, status: number): string {
  const reponse = exception.getResponse();
  if (
    typeof reponse === "object" &&
    reponse !== null &&
    "code" in reponse &&
    typeof reponse.code === "string"
  )
    return reponse.code;
  return CODES[status] ?? "ERROR";
}

export function corps(exception: unknown, status: number) {
  if (exception instanceof ZodValidationException) {
    return { statusCode: status, code: "VALIDATION_FAILED", message: "Données invalides" };
  }
  if (exception instanceof HttpException && status < 500) {
    return { statusCode: status, code: codeOf(exception, status), message: exception.message };
  }
  const indisponible = status === 503;
  return {
    statusCode: status,
    code: indisponible ? "SERVICE_UNAVAILABLE" : "INTERNAL_ERROR",
    message: indisponible ? "Service Unavailable" : "Internal Server Error",
  };
}
