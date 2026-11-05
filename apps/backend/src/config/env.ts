import { z } from "zod";

/**
 * Validation de l'env au BOOT (fail-fast) — l'app refuse de démarrer si une variable
 * requise manque/est invalide (cf socle §Config validée). Ceci est la tranche racine du
 * process ; chaque module lit la sienne (<module>.config.ts) et ne voit qu'elle.
 * Sentry lit la sienne (SENTRY_DSN, APP_ENV, RELEASE) dans @nutrion/sentry.
 */
const EnvSchema = z
  .object({
    // `production` dans toutes les images, préprod comprise : il règle les bibliothèques
    // (Express, Nest), jamais le comportement de l'application.
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    // Ce qui diffère d'un environnement à l'autre (environnement Sentry et PostHog, bandeau
    // de préprod, garde-fous du seed et des tests) se lit ICI, jamais dans NODE_ENV.
    APP_ENV: z.enum(["development", "preprod", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3001),
    // Port de la route de santé du process cron, interne au conteneur (non publié).
    CRON_HEALTH_PORT: z.coerce.number().int().positive().default(3100),
    DATABASE_URL: z.url(),
    REDIS_URL: z.url(),
    CORS_ORIGINS: z.string().default(""),
    // Pages de doc d'API (Scalar, Swagger UI, JSON). Fermées par défaut ; ouvertes en dev
    // et en préprod (cf socle §Doc d'API).
    EXPOSE_API_DOCS: z.enum(["true", "false"]).default("false"),
    // Requêtes par minute et par adresse IP (throttler global, socle hardening). Relevé
    // seulement pour un passage k6 en local ou en CI, tous les VUs partageant une adresse ;
    // jamais au-delà de 100 en production (refusé ci-dessous).
    THROTTLE_LIMIT: z.coerce.number().int().positive().default(100),
  })
  .refine((env) => env.APP_ENV !== "production" || env.THROTTLE_LIMIT <= 100, {
    path: ["THROTTLE_LIMIT"],
    message: "100 requêtes par minute au plus en production",
  });

export type Env = z.infer<typeof EnvSchema>;

/** Valide une tranche d'env ; sort du process avec une ligne JSON si elle est invalide. */
export function parseEnvSlice<T extends z.ZodType>(name: string, schema: T): z.infer<T> {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    // Le logger Pino n'existe pas encore : une ligne JSON sur stderr, comme lui l'écrirait.
    process.stderr.write(
      `${JSON.stringify({ level: "fatal", msg: `Env invalide (${name})`, fields: z.flattenError(parsed.error).fieldErrors })}\n`,
    );
    process.exit(1);
  }
  return parsed.data;
}

export function loadEnv(): Env {
  return parseEnvSlice("process", EnvSchema);
}
