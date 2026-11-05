// PREMIER import de cron/main.ts : les erreurs des jobs remontent dans Sentry, tag `cron`.
import { initSentry } from "@nutrion/sentry";

initSentry({ appTag: "cron" });
