import { randomUUID } from "node:crypto";
import { withoutQuery } from "@nutrion/sentry";
import type { Params } from "nestjs-pino";
import pino from "pino";
import { z } from "zod";

/**
 * Configuration Pino partagée par l'API et le process cron (skill logging §2), avec sa
 * tranche d'env. `env` est APP_ENV, le même nom que l'environnement Sentry ; jamais
 * NODE_ENV, qui vaut `production` dans les images.
 *
 * Une requête se journalise par son identifiant, sa méthode et son chemin, rien d'autre :
 * le sérialiseur par défaut de pino-http écrit tous les en-têtes (cookie, Authorization),
 * la chaîne de requête (jetons) et l'adresse IP du client.
 */
const config = z
  .object({
    APP_ENV: z.enum(["development", "preprod", "production"]).default("development"),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  })
  .parse(process.env);

interface RequeteSerialisee {
  id?: unknown;
  method?: string;
  url?: string;
}

export function loggerParams(service: "api" | "cron"): Params {
  return {
    pinoHttp: {
      level: config.LOG_LEVEL,
      base: { service: `nutrion-app-${service}`, env: config.APP_ENV },
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: { level: (label) => ({ level: label.toUpperCase() }) },
      // Corrélation : l'identifiant reçu en X-Request-Id s'il existe, sinon un neuf.
      genReqId: (req) => {
        const recu = req.headers["x-request-id"];
        return typeof recu === "string" && recu.length <= 128 ? recu : randomUUID();
      },
      customAttributeKeys: { reqId: "trace_id" },
      serializers: {
        req: (req: RequeteSerialisee) => ({
          id: req.id,
          method: req.method,
          path: withoutQuery(req.url ?? ""),
        }),
        res: (res: { statusCode?: number }) => ({ statusCode: res.statusCode }),
      },
    },
  };
}
