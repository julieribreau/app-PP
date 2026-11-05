// Tout ce qui change d'un environnement à l'autre vient de __ENV : aucun scénario n'écrit
// d'URL ni de compte (skill load-testing §1). Le backend local par défaut.
export const config = {
  backendUrl: __ENV.BACKEND_URL || "http://localhost:3001",
  // Identifiant du passage : marque ce qu'un scénario d'écriture crée (skill load-testing §2).
  runId: __ENV.K6_RUN_ID || String(Date.now()),
  // Durée du smoke : 1 minute par défaut, raccourcie dans le job e2e de la CI.
  smokeDuration: __ENV.K6_SMOKE_DURATION || "1m",
};
