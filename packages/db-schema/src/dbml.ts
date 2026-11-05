import { fileURLToPath } from "node:url";

import { pgGenerate } from "drizzle-dbml-generator";

import * as schema from "./schema";

// ERD du schéma (socle §Quality gates) : docs/architecture/schema.dbml, commité. Régénéré à
// chaque évolution du schéma (`pnpm db:dbml`) ; le job `erd` de ci.yml échoue s'il ne
// correspond plus au schéma, et le publie en artefact. DBML : texte, lisible dans la revue de
// la PR, et par tout outil DBML hors ligne.
pgGenerate({
  schema,
  out: fileURLToPath(new URL("../../../docs/architecture/schema.dbml", import.meta.url)),
  relational: false,
});
