#!/usr/bin/env node
// Rend le JSON de Semgrep en document Drive.
//
//   SAST_REPORT=docs/drive/bm-13-analyse-statique.md node scripts/rapport-sast.mjs /tmp/semgrep.json /tmp/semgrep.sarif
//
// Le document part chez le client : pas de tiret long, pas de puce, pas de
// flèche, pas d'emoji. tools/marqueurs.py du dépôt bullify-documentation
// refuse la publication sinon.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const entree = process.argv[2];
const sarif = process.argv[3];
const sortie = process.env.SAST_REPORT;
if (!entree || !sarif || !sortie) {
  console.error(
    "usage : SAST_REPORT=<chemin.md> node scripts/rapport-sast.mjs <semgrep.json> <semgrep.sarif>",
  );
  process.exit(2);
}

const brut = JSON.parse(readFileSync(entree, "utf8"));
const analyses = brut.paths?.scanned?.length ?? 0;

// Un scan qui ne lit aucun fichier rend zéro alerte, et zéro alerte se lit
// comme un bon résultat. C'est le seul échec vraiment dangereux de cet outil :
// il faut qu'il soit bruyant.
if (analyses === 0) {
  console.error("Semgrep n'a analysé aucun fichier. Configuration ou périmètre à revoir.");
  process.exit(1);
}

// Semgrep mélange deux échelles selon l'âge de la règle : ERROR/WARNING/INFO
// pour les anciennes, HIGH/MEDIUM/LOW pour les récentes. Les deux disent la
// même chose, le document n'en présente qu'une.
const NIVEAUX = [
  ["Élevée", new Set(["ERROR", "HIGH", "CRITICAL"])],
  ["Moyenne", new Set(["WARNING", "MEDIUM"])],
  ["Faible", new Set(["INFO", "LOW"])],
];
const niveau = (s) => NIVEAUX.find(([, set]) => set.has(String(s).toUpperCase()))?.[0] ?? "Faible";

// Le nom court de la règle suffit au lecteur : l'identifiant complet porte le
// chemin du dépôt de règles, qui n'apprend rien sur le code audité.
const nomRegle = (id) => String(id).split(".").pop();

// Semgrep rend les chemins tels qu'on les lui a donnés. Lancé sur un chemin
// absolu, il sort l'arborescence du runner, qui n'a rien à faire chez un
// client.
const racine = (process.env.SAST_RACINE ?? process.cwd()).replace(/\/$/, "");
const relatif = (p) => (p.startsWith(racine + "/") ? p.slice(racine.length + 1) : p);

// Le constat de Semgrep est en anglais et tient parfois en dix lignes. La
// première phrase dit le défaut, le reste explique comment le corriger : ça
// appartient au ticket, pas au document remis.
// Ces messages viennent du registry de règles, pas de nous : ils portent des
// tirets longs et parfois des puces, que marqueurs.py refuse à la publication.
// Nettoyé ici plutôt que découvert au moment de pousser dans un Drive.
const assainir = (t) =>
  t
    .replace(/[‐-―]/g, "-")
    .replace(/[•←-⇿☀-➿⤀-⥿⬀-⯿️‍]/g, "")
    .replace(/[\u{1f000}-\u{1faff}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

const constat = (m) => {
  const t = assainir(String(m ?? ""));
  const fin = t.search(/\.\s/);
  const court = fin > 0 ? t.slice(0, fin + 1) : t;
  return court.length > 220 ? court.slice(0, 217) + "..." : court;
};

const alertes = (brut.results ?? []).map((r) => ({
  regle: nomRegle(r.check_id),
  niveau: niveau(r.extra?.severity),
  fichier: relatif(r.path),
  ligne: r.start?.line ?? 0,
  message: constat(r.extra?.message),
  cwe: [].concat(r.extra?.metadata?.cwe ?? []).map((c) => String(c).split(":")[0]),
}));

const compte = (n) => alertes.filter((a) => a.niveau === n).length;
const langues = [...new Set((brut.paths?.scanned ?? []).map((p) => p.split(".").pop()))]
  .filter((e) => ["ts", "tsx", "js", "jsx", "mjs", "cjs", "py", "yml", "yaml", "tf"].includes(e))
  .sort();

// Les alertes examinées puis écartées (`nosemgrep`) sortent du JSON de
// Semgrep. Le SARIF du même passage les garde, marquées `suppressions` : c'est
// lui qui les recense, pour qu'un zéro ne cache rien. Un commentaire qui
// n'écarte plus rien n'y figure pas.
const ecartees = [
  ...new Map(
    (JSON.parse(readFileSync(sarif, "utf8")).runs ?? [])
      .flatMap((run) => run.results ?? [])
      .filter((r) => r.suppressions?.length)
      .map((r) => {
        const p = r.locations?.[0]?.physicalLocation;
        const e = {
          regle: nomRegle(r.ruleId),
          fichier: decodeURIComponent(p?.artifactLocation?.uri ?? ""),
          ligne: p?.region?.startLine ?? 0,
        };
        return [`${e.fichier}:${e.ligne}:${e.regle}`, e];
      }),
  ).values(),
].sort((x, y) => x.fichier.localeCompare(y.fichier) || x.ligne - y.ligne);

const aujourdhui = new Date().toISOString().slice(0, 10);
const regles = process.env.SAST_REGLES ?? "owasp-top-ten, javascript, typescript, python, secrets";

const l = [];
l.push("# Analyse statique du code");
l.push("");
l.push("Ce document recense ce que l'analyse statique du code source relève sur le");
l.push("projet : erreurs de programmation exploitables, secrets laissés en clair,");
l.push("dépendances et chaînes de construction mal verrouillées. Il est régénéré la");
l.push("nuit qui suit chaque modification du code, sans");
l.push("intervention humaine.");
l.push("");
l.push("L'outil est Semgrep, dans sa version libre. Il lit le code sans l'exécuter");
l.push("et sans le transmettre à un tiers.");
l.push("");
l.push(`Date du relevé : ${aujourdhui}`);
l.push("");
l.push(`Fichiers analysés : ${analyses}`);
l.push("");
l.push(`Jeux de règles appliqués : ${regles}`);
l.push("");
if (langues.length) {
  l.push(`Langages couverts : ${langues.join(", ")}`);
  l.push("");
}
l.push("Écartés du périmètre : les fichiers de test, les dossiers de construction");
l.push("et les dépendances installées. Ils ne sont pas livrés, ou le sont sous une");
l.push("forme que l'analyse du code source ne décrit pas.");
l.push("");
l.push("## Verdict");
l.push("");
l.push("| Gravité | Alertes |");
l.push("| --- | --- |");
for (const [n] of NIVEAUX) l.push(`| ${n} | ${compte(n)} |`);
l.push("");
if (alertes.length === 0) {
  l.push("Aucune alerte. Les règles appliquées ne relèvent rien sur le code du");
  l.push("projet dans son état actuel.");
  if (ecartees.length)
    l.push(`${ecartees.length} alerte(s) écartée(s) après examen sont recensées plus bas.`);
} else {
  l.push(`${alertes.length} alerte(s) restent à traiter. Toute alerte, quelle que soit sa`);
  l.push("gravité, est corrigée, ou écartée dans le code avec sa justification, avant");
  l.push("la prochaine mise en production.");
}
l.push("");

// Le détail complet pour ce qui doit être corrigé, le compte par règle pour le
// reste. Une centaine de lignes de tableau pour des alertes secondaires ne se
// lit pas, et noierait les quelques unes qui comptent.
const eleves = alertes.filter((a) => a.niveau === "Élevée");
if (eleves.length) {
  l.push("## Alertes de gravité élevée");
  l.push("");
  l.push("Chacune est reprise avec son emplacement, pour être tracée jusqu'à sa");
  l.push("correction.");
  l.push("");
  l.push("| Règle | Fichier | Ligne | Constat |");
  l.push("| --- | --- | --- | --- |");
  // Trié par fichier : le lecteur corrige un fichier à la fois, pas une règle
  // à la fois.
  for (const a of eleves.sort((x, y) => x.fichier.localeCompare(y.fichier) || x.ligne - y.ligne)) {
    const cwe = a.cwe.length ? ` (${a.cwe.join(", ")})` : "";
    l.push(`| \`${a.regle}\` | \`${a.fichier}\` | ${a.ligne} | ${a.message}${cwe} |`);
  }
  l.push("");
}

const secondaires = alertes.filter((a) => a.niveau !== "Élevée");
if (secondaires.length) {
  l.push("## Alertes de gravité moyenne et faible");
  l.push("");
  l.push("Regroupées par règle. Le relevé complet, emplacement par emplacement,");
  l.push("est conservé avec l'exécution qui a produit ce document.");
  l.push("");
  l.push("| Règle | Gravité | Occurrences | Fichiers | Constat |");
  l.push("| --- | --- | --- | --- | --- |");
  const parRegle = new Map();
  for (const a of secondaires) {
    const e = parRegle.get(a.regle) ?? { ...a, n: 0, fichiers: new Set() };
    e.n += 1;
    e.fichiers.add(a.fichier);
    parRegle.set(a.regle, e);
  }
  for (const e of [...parRegle.values()].sort((x, y) => y.n - x.n)) {
    const cwe = e.cwe.length ? ` (${e.cwe.join(", ")})` : "";
    l.push(`| \`${e.regle}\` | ${e.niveau} | ${e.n} | ${e.fichiers.size} | ${e.message}${cwe} |`);
  }
  l.push("");
}

if (ecartees.length) {
  l.push("## Alertes écartées après examen");
  l.push("");
  l.push("Une alerte examinée puis écartée, parce qu'elle est fausse ou qu'elle porte");
  l.push("sur un choix assumé, ne compte plus au verdict. Chacune est justifiée dans");
  l.push("le code, par un commentaire sur la ligne indiquée ou celle d'avant.");
  l.push("");
  l.push("| Règle | Fichier | Ligne |");
  l.push("| --- | --- | --- |");
  for (const e of ecartees) l.push(`| \`${e.regle}\` | \`${e.fichier}\` | ${e.ligne} |`);
  l.push("");
}

l.push("## Portée et limites");
l.push("");
l.push("L'analyse suit les données à l'intérieur de chaque fichier. Un chemin de");
l.push("données qui traverse plusieurs fichiers avant d'atteindre une opération");
l.push("sensible peut lui échapper : cette capacité relève de la version payante");
l.push("de l'outil. Le contrôle est donc un filet, pas une preuve d'absence de");
l.push("défaut, et il complète la relecture de code et les tests.");
l.push("");
l.push("Ce document porte l'état du code à la date du relevé. Une alerte corrigée");
l.push("disparaît du relevé suivant.");
l.push("");

mkdirSync(dirname(sortie), { recursive: true });
writeFileSync(sortie, l.join("\n"));
console.log(`${sortie} : ${alertes.length} alerte(s) sur ${analyses} fichiers.`);
