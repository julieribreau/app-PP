#!/usr/bin/env node
// Réduit le relevé SARIF de Semgrep à ce qui part dans le Drive, à côté du
// document 13 :
//
//   node scripts/sarif-reduit.mjs /tmp/semgrep.sarif docs/drive/sarif/bm-13-analyse-statique.sarif
//
// - les seules règles qui ont relevé quelque chose. Semgrep décrit les six
//   cents qu'il applique : 1,2 Mo pour un relevé à zéro ;
// - sans les avertissements d'exécution, qui citent des bouts de code.
//
// Les alertes écartées par `nosemgrep` restent, marquées `suppressions` :
// c'est ce que le format prévoit pour elles. Résultats triés : un relevé
// inchangé ne doit pas faire de commit.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const [entree, sortie] = process.argv.slice(2);
if (!entree || !sortie) {
  console.error("usage : node scripts/sarif-reduit.mjs <entrée.sarif> <sortie.sarif>");
  process.exit(2);
}

const lieu = (r) => {
  const p = r.locations?.[0]?.physicalLocation;
  return `${p?.artifactLocation?.uri ?? ""}:${String(p?.region?.startLine ?? 0).padStart(8, "0")}:${r.ruleId}`;
};

const sarif = JSON.parse(readFileSync(entree, "utf8"));
for (const run of sarif.runs ?? []) {
  const resultats = run.results ?? [];
  const vues = new Set(resultats.map((r) => r.ruleId));
  if (run.tool?.driver?.rules)
    run.tool.driver.rules = run.tool.driver.rules.filter((r) => vues.has(r.id));
  for (const inv of run.invocations ?? []) delete inv.toolExecutionNotifications;
  resultats.sort((a, b) => lieu(a).localeCompare(lieu(b)));
}

mkdirSync(dirname(sortie), { recursive: true });
writeFileSync(sortie, JSON.stringify(sarif, null, 2) + "\n");
console.log(`${sortie} : ${sarif.runs?.[0]?.results?.length ?? 0} résultat(s).`);
