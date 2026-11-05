// Hook d'instrumentation Next, chargé une fois au démarrage du serveur. À la racine de
// l'app, à côté de app/ : ailleurs, le build standalone l'ignore sans rien dire.
export async function register(): Promise<void> {
  // Sans DSN (dev local), on ne charge pas Sentry : il tirerait OpenTelemetry dans
  // chaque worker Turbopack pour rien.
  if (!process.env["SENTRY_DSN"]) return;
  await import("./sentry.config");
}

export { captureRequestError as onRequestError } from "@sentry/nextjs";
