import { existsSync } from "node:fs";
import { resolve } from "node:path";

// Dev local : charge le `.env` du dépôt (racine), ou celui du dossier courant. Jamais en
// préprod ni en prod : l'environnement y vient du conteneur. Une variable déjà posée gagne.
if (process.env["APP_ENV"] !== "production" && process.env["APP_ENV"] !== "preprod") {
  for (const candidat of [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")]) {
    if (existsSync(candidat)) {
      process.loadEnvFile(candidat);
      break;
    }
  }
}
