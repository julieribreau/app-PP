// PREMIER import de main.ts : Sentry doit être initialisé avant le chargement de Nest
// pour que l'auto-instrumentation HTTP voie toutes les requêtes (socle §Sentry dès l'init).
import { initSentry } from "@nutrion/sentry";

initSentry({ appTag: "api" });
