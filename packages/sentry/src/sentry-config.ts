// Tranche d'env de la lib Sentry, validée ici (chaque lib possède la sienne).
//
// `environment` vient d'APP_ENV, jamais de NODE_ENV : NODE_ENV vaut `production` dans
// toutes les images, préprod comprise. `release` est le tag de l'image déployée
// (`sha-<hexa>`), figé dans l'image au build.
import { z } from "zod";

/** Hôtes d'ingestion admis : la région UE, et la boucle locale pour un faux point d'ingestion de test. */
function dsnAdmis(dsn: string): boolean {
  const { hostname } = new URL(dsn);
  return (
    hostname.endsWith(".ingest.de.sentry.io") ||
    hostname === "127.0.0.1" ||
    hostname === "localhost"
  );
}

export const sentryConfigSchema = z.object({
  // Un DSN américain ferait sortir les traces de l'Union sans que rien ne le signale :
  // le process refuse de démarrer plutôt que de l'utiliser.
  dsn: z.url().refine(dsnAdmis, "DSN hors région UE (attendu : *.ingest.de.sentry.io)").optional(),
  environment: z.enum(["development", "preprod", "production"]).default("development"),
  release: z.string().min(1).default("local"),
});

export type SentryConfig = z.infer<typeof sentryConfigSchema>;

/** Variable vide = absente : un `.env` qui laisse `SENTRY_DSN=` désactive Sentry. */
function lire(nom: string): string | undefined {
  return process.env[nom] || undefined;
}

export function loadSentryConfig(): SentryConfig {
  return sentryConfigSchema.parse({
    dsn: lire("SENTRY_DSN"),
    environment: lire("APP_ENV"),
    release: lire("RELEASE"),
  });
}
