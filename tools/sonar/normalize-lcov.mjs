#!/usr/bin/env node
// Normalise les chemins `SF:` des rapports lcov en relatif-racine du repo.
//
// Pourquoi : en monorepo, vitest émet des chemins `SF:` relatifs au package
// (`src/lines/index.ts`). Le CoverageSensor de SonarQube résout ces chemins par
// matching de suffixe ; or plusieurs packages exposent le même sous-chemin métier
// (`adapter-lines/src/lines/index.ts` ET `api-port/src/lines/index.ts`). Le match
// devient ambigu → le fichier est laissé NON couvert (0 %) alors qu'il est testé.
// En préfixant chaque `SF:` par le chemin du package relatif à la racine, le
// chemin devient unique et exact → résolution déterministe.
//
// Idempotent : un `SF:` déjà résoluble depuis la racine est laissé tel quel.
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

// Découvre les lcov à normaliser (hors node_modules).
function findLcov(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "coverage" || entry.name === "coverage-jest") {
        const lcov = path.join(full, "lcov.info");
        if (fs.existsSync(lcov)) acc.push(lcov);
      } else {
        findLcov(full, acc);
      }
    }
  }
  return acc;
}

const lcovFiles = findLcov(repoRoot);

// Détection de dérive : tout lcov présent sur disque mais absent de
// sonar.javascript.lcov.reportPaths est invisible pour Sonar (couverture perdue en
// silence). On le signale bruyamment plutôt que de sous-compter la couverture.
const propsPath = path.join(repoRoot, "sonar-project.properties");
if (fs.existsSync(propsPath)) {
  const props = fs.readFileSync(propsPath, "utf8");
  const line = props.split("\n").find((l) => l.startsWith("sonar.javascript.lcov.reportPaths="));
  const listed = new Set((line?.split("=")[1] ?? "").split(",").map((s) => s.trim()));
  const missing = lcovFiles
    .map((f) => path.relative(repoRoot, f))
    .filter((rel) => !listed.has(rel));
  if (missing.length > 0) {
    console.warn(
      `normalize-lcov: ⚠️  ${missing.length} rapport(s) lcov absent(s) de reportPaths ` +
        `(couverture non comptée) → ajoute-les à sonar-project.properties :\n  ${missing.join("\n  ")}`,
    );
  }
}

let totalFiles = 0;
let totalRewritten = 0;

for (const lcovPath of lcovFiles) {
  // base = dossier contenant `coverage/` (= racine du package), relatif au repo.
  const base = path.relative(repoRoot, path.dirname(path.dirname(lcovPath)));
  const lines = fs.readFileSync(lcovPath, "utf8").split("\n");
  let rewritten = 0;
  const out = lines.map((line) => {
    if (!line.startsWith("SF:")) return line;
    const rel = line.slice(3).trim();
    // Déjà résoluble depuis la racine ? on ne touche pas (idempotence).
    if (fs.existsSync(path.join(repoRoot, rel))) return line;
    const prefixed = path.normalize(path.join(base, rel));
    // Ne préfixe que si ça pointe vers un fichier réel (évite le bruit dist/).
    if (fs.existsSync(path.join(repoRoot, prefixed))) {
      rewritten += 1;
      return `SF:${prefixed}`;
    }
    return line;
  });
  if (rewritten > 0) {
    fs.writeFileSync(lcovPath, out.join("\n"));
    totalFiles += 1;
    totalRewritten += rewritten;
  }
}

console.log(
  `normalize-lcov: ${totalRewritten} chemins SF préfixés dans ${totalFiles} rapport(s) lcov.`,
);
