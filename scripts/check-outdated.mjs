#!/usr/bin/env node
// Etat de fraicheur des dependances directes.
// Repond a : sommes-nous sur la derniere version de chaque bibliotheque ?
//
// Usage :
//   npm  : npm outdated --json > /tmp/out.json
//   pnpm : pnpm outdated -r --format json > /tmp/out.json
//   node scripts/check-outdated.mjs /tmp/out.json [autre.json ...]
//
// Sortie : docs/versions-dependances.md (ecrase a chaque run).
//
// RETENUES_JSON=<fichier> : les retenues du robot de montee, ecrites par
// `SIMULER=1 RETENUES_JSON=<fichier> node scripts/maj-dependances.mjs ...`.
// Un paquet que le robot tient a dessein (SDK Expo, correctif local, pair)
// n'est pas en retard : il quitte les sections de retard pour « Retenues
// volontaires », avec sa raison. Sans ce fichier, le 08 de simr comptait
// 7 majeures et 14 mineures de retard, toutes tenues par le SDK Expo 57.
// Une entree de releve peut aussi porter sa raison (`retenue`) : pip-outdated.mjs
// y met celle d'un « # maj-python: tenir <raison> ».
//
// Code de sortie TOUJOURS 0 : c'est un releve, pas un verrou. Une CI rouge en
// permanence parce qu'une bibliotheque a publie une version n'est plus lue au
// bout d'une semaine. Le blocage, c'est l'affaire des licences et des CVE.

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

// --- Barriere de diffusion ---------------------------------------------------

// Le document peut partir dans le Drive d'un client : ni emoji, ni tiret
// typographique, ni fleche. Memes plages que tools/marqueurs.py.
const MARQUEURS =
  /[‐-―•←-⇿☀-➿⤀-⥿⬀-⯿️‍]|[\u{1f000}-\u{1faff}]/gu;
const assainir = (t) => t.replace(MARQUEURS, (c) => (/[‐-―]/.test(c) ? "-" : ""));

// --- Comparaison de versions -------------------------------------------------

// Semver reduit a ce dont on a besoin : le triplet, sans la pre-release.
// "1.2.3-beta.4" donne [1,2,3] : une pre-release ne change pas l'ampleur du
// retard, qui est ce que le lecteur veut savoir.
function triplet(v) {
  const m = /^\D*(\d+)(?:\.(\d+))?(?:\.(\d+))?/.exec(String(v ?? ""));
  return m ? [Number(m[1]), Number(m[2] ?? 0), Number(m[3] ?? 0)] : null;
}

// majeur > mineur > correctif, ou null si les versions sont egales ou illisibles.
function ampleur(actuelle, derniere) {
  const a = triplet(actuelle);
  const d = triplet(derniere);
  if (!a || !d) return null;
  if (d[0] > a[0]) return "majeur";
  if (d[0] < a[0]) return null; // installee plus recente que "latest" : rien a signaler
  if (d[1] > a[1]) return "mineur";
  if (d[1] < a[1]) return null;
  if (d[2] > a[2]) return "correctif";
  return null;
}

// --- Retenues ----------------------------------------------------------------

// Le fichier RETENUES_JSON -> nom -> { garde, disponible, raison }. Deux entrees
// du meme nom (deux passages du robot) joignent leurs raisons.
function lireRetenues(texte) {
  const parNom = new Map();
  for (const r of JSON.parse(texte || "[]")) {
    if (!r?.nom) continue;
    const e = parNom.get(r.nom);
    if (e && r.raison && !e.raison.split(" ; ").includes(r.raison)) e.raison += ` ; ${r.raison}`;
    else if (!e)
      parNom.set(r.nom, { garde: r.garde, disponible: r.disponible, raison: r.raison || "?" });
  }
  return parNom;
}

// La raison pour laquelle un paquet en retard (ampleur `a`) est tenu a dessein,
// ou null : c'est alors un retard ordinaire.
//   - `p.retenue` : raison portee par le releve (« # maj-python: tenir »).
//   - `robot` : les retenues du robot de montee. S'il peut encore monter le
//     paquet dans ce qui le tient (plage du SDK), la raison le dit : ce reste-la
//     est un vrai retard, a ne pas taire.
//   - @types/node suit la majeure du runtime vise, la LTS active (meme cible
//     que les images node), pas la derniere publiee : les types 26 sur un node
//     24 decrivent des API absentes en production.
function raisonDeRetenue(p, a, robot, majeureNode) {
  if (!a) return null;
  if (p.retenue) return p.retenue;
  const r = robot.get(p.name);
  if (r) {
    const reste = r.garde && ampleur(p.current, r.garde);
    return reste ? `${r.raison} ; montée possible jusqu'à ${r.garde}` : r.raison;
  }
  const suitLeRuntime =
    p.name === "@types/node" &&
    majeureNode !== null &&
    triplet(p.current)?.[0] === majeureNode &&
    a === "majeur";
  return suitLeRuntime ? `suit node ${majeureNode}, le runtime (derniere LTS)` : null;
}

// Une barre verticale couperait la cellule d'un tableau Markdown (`^9 || ^10`).
const cellule = (t) => String(t).replaceAll("|", String.raw`\|`);

// --- Exceptions de securite --------------------------------------------------

// Les [[IgnoredVulns]] de osv-scanner.toml : des avis sans version corrigee,
// acceptes jusqu'a ce qu'un correctif sorte (scripts/check-osv.mjs echoue alors).
// Le format est simple (`cle = valeur` sous chaque en-tete) : pas de dependance
// TOML pour si peu. Un autre en-tete (`[...]`) clot le bloc.
function lireExceptions(texte) {
  const valeur = (bloc, cle) => {
    const m = new RegExp(String.raw`^\s*${cle}\s*=\s*(?:"((?:[^"\\]|\\.)*)"|(\S+))`, "m").exec(bloc);
    return m ? (m[1] ?? m[2]).replaceAll(String.raw`\"`, '"') : "";
  };
  return texte
    .split(/^\s*\[\[IgnoredVulns\]\]\s*$/m)
    .slice(1)
    .map((bloc) => bloc.split(/^\s*\[/m)[0])
    .map((bloc) => ({ id: valeur(bloc, "id"), motif: valeur(bloc, "reason"), revue: valeur(bloc, "ignoreUntil") }))
    .filter((e) => e.id);
}

function sectionExceptions(exceptions) {
  const avis = (id) => (id.startsWith("GHSA-") ? `[${id}](https://github.com/advisories/${id})` : id);
  return [
    `## Vulnérabilités connues sans correctif`,
    ``,
    `Ces failles de sécurité sont connues et publiées, mais aucune version corrigée`,
    `de la bibliothèque concernée n'existe encore : il n'y a rien à installer pour`,
    `les faire disparaître. Elles sont donc acceptées en connaissance de cause, après`,
    `examen de leur portée. Le contrôle de sécurité, joué à chaque modification et`,
    `chaque nuit, signale automatiquement la sortie d'un correctif : la dépendance`,
    `est alors montée. La date de revue est celle à laquelle l'acceptation est`,
    `réexaminée, même sans correctif.`,
    ``,
    ...(exceptions.length === 0
      ? [`Aucune.`]
      : [
          `| Avis | Motif | Revue au plus tard |`,
          `| --- | --- | --- |`,
          ...exceptions.map((e) => `| ${avis(e.id)} | ${cellule(e.motif)} | ${e.revue} |`),
        ]),
    ``,
  ];
}

// --- Lecture -----------------------------------------------------------------

// npm  : { pkg: { current, wanted, latest, dependent } }, ou un tableau de ces
//        objets quand plusieurs espaces de travail dependent du meme paquet.
// pnpm : { pkg: { current, wanted, latest, isDeprecated, dependencyType } }
function lire(chemin) {
  const brut = readFileSync(chemin, "utf8").trim();
  if (!brut) return []; // aucun paquet en retard : les deux outils sortent vide
  // pnpm ecrit ses avertissements reseau sur la meme sortie que le JSON
  // ("[WARN] GET https://registry... UND_ERR_SOCKET"). On ne garde que l'objet.
  const debut = brut.indexOf("{");
  const fin = brut.lastIndexOf("}");
  if (debut === -1 || fin < debut) return [];
  const data = JSON.parse(brut.slice(debut, fin + 1));
  const out = [];
  for (const [name, valeur] of Object.entries(data)) {
    for (const v of Array.isArray(valeur) ? valeur : [valeur]) {
      out.push({
        name,
        current: v.current ?? "",
        wanted: v.wanted ?? "",
        latest: v.latest ?? "",
        deprecated: v.isDeprecated === true,
        type: v.dependencyType === "devDependencies" ? "développement" : "production",
        retenue: typeof v.retenue === "string" ? v.retenue : "",
      });
    }
  }
  return out;
}

// Inventaire des dependances directes, pour pouvoir citer AUSSI celles qui sont
// deja a jour : ni npm outdated ni pnpm outdated ne les listent.
//   npm  : npm ls --depth 0 --json    -> { name, version, dependencies: { dep: { version } } }
//   pnpm : pnpm ls -r --depth 0 --json -> [ { dependencies: {...}, devDependencies: {...} } ]
function lireArbre(data) {
  const directes = new Map();
  const ajouter = (deps, type) => {
    for (const [nom, n] of Object.entries(deps ?? {})) {
      const v = n?.version ?? "";
      if (!v) continue;
      // Paquet interne au workspace : ce n'est pas une dependance tierce, mais
      // SES dependances en sont, et npm ne les remonte pas autrement. pnpm, lui,
      // rend un element de tableau par projet : rien a descendre.
      const interne = v.startsWith("link:") || String(n.resolved ?? "").startsWith("file:");
      if (interne) {
        ajouter(n.dependencies, type);
        continue;
      }
      if (!directes.has(nom)) directes.set(nom, { version: v, type });
    }
  };
  for (const projet of Array.isArray(data) ? data : [data]) {
    ajouter(projet.dependencies, "production");
    ajouter(projet.devDependencies, "développement");
  }
  return directes;
}

const entrees = process.argv.slice(2);

if (entrees[0] === "--selftest") {
  const cas = [
    ["1.2.3", "2.0.0", "majeur"],
    ["1.2.3", "1.3.0", "mineur"],
    ["1.2.3", "1.2.4", "correctif"],
    ["1.2.3", "1.2.3", null],
    ["2.0.0", "1.9.9", null], // installee plus recente que latest
    ["0.91.1", "0.127.0", "mineur"], // 0.x : le mineur porte les ruptures, on ne ment pas sur l'ampleur
    ["15.0.0-beta.1", "15.0.2", "correctif"],
    ["v3.1.0", "4.0.0", "majeur"],
    ["", "1.0.0", null],
  ];
  for (const [a, d, attendu] of cas) {
    const got = ampleur(a, d);
    if (got !== attendu) {
      console.error(`FAIL ${a} -> ${d} : attendu ${attendu}, obtenu ${got}`);
      process.exit(1);
    }
  }
  const sale = "un ✅ un — une → fin";
  if (assainir(sale) !== "un  un - une  fin") {
    console.error("FAIL assainir");
    process.exit(1);
  }

  // Retenues : le robot (SDK Expo, correctif local, pair), le releve pip, @types/node.
  const robot = lireRetenues(
    JSON.stringify([
      {
        nom: "react-native",
        garde: "0.86.2",
        disponible: "0.87.1",
        raison: "SDK Expo 57.0.14 : 0.86.2",
      },
      {
        nom: "jest-expo",
        garde: "57.0.5",
        disponible: "58.0.1",
        raison: "SDK Expo 57.0.14 : ~57.0.4",
      },
      { nom: "typescript", garde: "6.0.3", disponible: "7.0.2", raison: "eslint : ^9 || ^10" },
      {
        nom: "typescript",
        garde: "6.0.3",
        disponible: "7.0.2",
        raison: "SDK Expo 57.0.14 : ~6.0.3",
      },
    ]),
  );
  const paquet = (name, current, retenue = "") => ({ name, current, retenue });
  const retenues = [
    // Tenu par le SDK : retenue, pas retard.
    [paquet("react-native", "0.86.2"), "mineur", "SDK Expo 57.0.14 : 0.86.2"],
    // Tenu par le SDK, mais un correctif reste permis sous lui : dit.
    [
      paquet("jest-expo", "57.0.4"),
      "majeur",
      "SDK Expo 57.0.14 : ~57.0.4 ; montée possible jusqu'à 57.0.5",
    ],
    // Deux passages du robot : raisons jointes.
    [paquet("typescript", "6.0.3"), "majeur", "eslint : ^9 || ^10 ; SDK Expo 57.0.14 : ~6.0.3"],
    // Retenu mais pas en retard : rien a dire.
    [paquet("react-native", "0.87.1"), null, null],
    // Absent des retenues : retard ordinaire.
    [paquet("zod", "3.25.0"), "majeur", null],
    // « # maj-python: tenir » porte par le releve pip.
    [paquet("redis", "6.4.0", "kombu exige redis<6.5"), "majeur", "kombu exige redis<6.5"],
    // @types/node sur la majeure du runtime : retenue ; en retard sur elle : retard.
    [paquet("@types/node", "24.3.0"), "majeur", "suit node 24, le runtime (derniere LTS)"],
    [paquet("@types/node", "22.3.0"), "majeur", null],
  ];
  for (const [p, a, attendu] of retenues) {
    const got = raisonDeRetenue(p, a, robot, 24);
    if (got !== attendu) {
      console.error(`FAIL retenue ${p.name} ${p.current} : attendu ${attendu}, obtenu ${got}`);
      process.exit(1);
    }
  }
  if (cellule("eslint : ^9 || ^10") !== String.raw`eslint : ^9 \|\| ^10`) {
    console.error("FAIL cellule");
    process.exit(1);
  }

  // Exceptions de osv-scanner.toml : commentaires ignores, autre en-tete qui clot le bloc.
  const exceptions = lireExceptions(
    [
      "# en-tete",
      "[[IgnoredVulns]]",
      'id = "GHSA-aaaa-bbbb-cccc"',
      "ignoreUntil = 2027-01-05",
      'reason = "x 1.0 : aucun correctif | dit \\"ainsi\\""',
      "",
      '# id = "commentaire"',
      "[[IgnoredVulns]]",
      'id = "PYSEC-2026-1"',
      "[[PackageOverrides]]",
      'reason = "hors bloc"',
    ].join("\n"),
  );
  const attendues = JSON.stringify([
    { id: "GHSA-aaaa-bbbb-cccc", motif: 'x 1.0 : aucun correctif | dit "ainsi"', revue: "2027-01-05" },
    { id: "PYSEC-2026-1", motif: "", revue: "" },
  ]);
  const section = sectionExceptions(exceptions).join("\n");
  if (
    JSON.stringify(exceptions) !== attendues ||
    !section.includes(
      String.raw`| [GHSA-aaaa-bbbb-cccc](https://github.com/advisories/GHSA-aaaa-bbbb-cccc) | x 1.0 : aucun correctif \| dit "ainsi" | 2027-01-05 |`,
    ) ||
    !section.includes("| PYSEC-2026-1 |") ||
    !sectionExceptions(lireExceptions("")).includes("Aucune.")
  ) {
    console.error(`FAIL exceptions : ${JSON.stringify(exceptions)}`);
    process.exit(1);
  }
  console.log(
    `selftest OK (${cas.length} cas, ${retenues.length} retenues, exceptions + barrière de diffusion)`,
  );
  process.exit(0);
}

if (entrees.length === 0) {
  console.error("Usage : node scripts/check-outdated.mjs <outdated.json> [autre.json ...]");
  console.error("  npm  : npm outdated --json > /tmp/out.json");
  console.error("  pnpm : pnpm outdated -r --format json > /tmp/out.json");
  process.exit(2);
}

// Un meme paquet peut remonter de plusieurs espaces de travail : une ligne suffit.
const vus = new Map();
const directes = new Map();
for (const chemin of entrees) {
  const brut = readFileSync(chemin, "utf8").trim();
  if (!brut) continue;
  const debut = brut.indexOf("{");
  const crochet = brut.indexOf("[");
  const depart = crochet !== -1 && (debut === -1 || crochet < debut) ? crochet : debut;
  if (depart === -1) continue;
  const data = JSON.parse(brut.slice(depart, brut.lastIndexOf(depart === crochet ? "]" : "}") + 1));

  // Un inventaire porte .dependencies ; un releve de retard a des valeurs
  // qui portent .current. C'est ce qui distingue les deux entrees.
  const inventaire =
    Array.isArray(data) || (data && typeof data === "object" && "dependencies" in data);
  if (inventaire) {
    for (const [nom, v] of lireArbre(data)) if (!directes.has(nom)) directes.set(nom, v);
    continue;
  }
  for (const p of lire(chemin)) {
    const cle = `${p.name}@${p.current}`;
    if (!vus.has(cle)) vus.set(cle, p);
  }
}

const retards = { majeur: [], mineur: [], correctif: [] };
// Une version plus recente que le projet tient a dessein : ni retard, ni oubli.
// La raison est donnee pour chacune (raisonDeRetenue).
const retenues = [];
const robot = lireRetenues(
  process.env.RETENUES_JSON && existsSync(process.env.RETENUES_JSON)
    ? readFileSync(process.env.RETENUES_JSON, "utf8")
    : "",
);
let majeureNode = null;
try {
  const { choisirCycle } = await import("./maj-externes.mjs");
  const r = await fetch("https://endoflife.date/api/nodejs.json");
  const cycle = choisirCycle(r.ok ? await r.json() : null);
  if (cycle) majeureNode = Number(String(cycle).split(".")[0]);
} catch {
  // endoflife.date injoignable : @types/node se juge comme les autres.
}
const deprecies = [];
// wanted != current : la version est deja autorisee par le package.json, elle
// n'attend qu'une commande de mise a jour. C'est le gain immediat.
const immediats = [];

for (const p of vus.values()) {
  if (p.deprecated) deprecies.push(p);
  const a = ampleur(p.current, p.latest);
  const raison = raisonDeRetenue(p, a, robot, majeureNode);
  if (raison) retenues.push({ ...p, raison });
  else if (a) retards[a].push(p);
  if (p.wanted && p.current && p.wanted !== p.current) immediats.push(p);
}

const tri = (l) => l.sort((x, y) => x.name.localeCompare(y.name));
for (const k of Object.keys(retards)) tri(retards[k]);
tri(deprecies);
tri(immediats);
tri(retenues);

const total = retards.majeur.length + retards.mineur.length + retards.correctif.length;
const retenusParNom = new Set(retenues.map((p) => p.name));
const today = new Date().toISOString().slice(0, 10);

const md = [
  `# État des versions des dépendances`,
  ``,
  `Ce document indique, pour chaque bibliothèque que le projet déclare, si une`,
  `version plus récente existe et quelle est l'ampleur de l'écart. Il est`,
  `régénéré la nuit qui suit chaque modification du code, sans intervention humaine.`,
  ``,
  `Date du relevé : ${today}`,
  ``,
  ...(directes.size > 0
    ? [`Dépendances directes déclarées par le projet : ${directes.size}`, ``]
    : []),
  `Dépendances directes ayant une version plus récente : ${total + retenues.length}`,
  ``,
  `## Synthèse`,
  ``,
  `| Écart | Dépendances | Ce que cela implique |`,
  `| --- | --- | --- |`,
  `| Version majeure de retard | ${retards.majeur.length} | Changements de rupture probables, migration à planifier |`,
  `| Version mineure de retard | ${retards.mineur.length} | Fonctionnalités ajoutées en amont, mise à jour sans rupture annoncée |`,
  `| Correctif de retard | ${retards.correctif.length} | Corrections de bugs uniquement |`,
  `| Retenue volontaire | ${retenues.length} | Version plus récente écartée à dessein, raison donnée pour chacune : se lève avec sa cause |`,
  `| Dépendances dépréciées | ${deprecies.length} | Abandonnées en amont, à remplacer |`,
  ``,
];

if (total === 0 && deprecies.length === 0) {
  md.push(
    retenues.length === 0
      ? `Toutes les dépendances directes sont à leur dernière version publiée.`
      : `Aucune dépendance directe n'est en retard : les versions plus récentes non installées sont toutes retenues volontairement, pour les raisons données plus bas.`,
    ``,
  );
}

md.push(
  ...sectionExceptions(
    existsSync("osv-scanner.toml") ? lireExceptions(readFileSync("osv-scanner.toml", "utf8")) : [],
  ),
);

if (deprecies.length > 0) {
  md.push(
    `## Dépendances dépréciées`,
    ``,
    `Leurs auteurs ont annoncé qu'elles ne seraient plus maintenues. Elles`,
    `continuent de fonctionner mais ne recevront plus de correctif, y compris`,
    `de sécurité. Chacune demande un remplacement planifié.`,
    ``,
    `| Dépendance | Version utilisée | Usage |`,
    `| --- | --- | --- |`,
    ...deprecies.map((p) => `| \`${p.name}\` | ${p.current} | ${p.type} |`),
    ``,
  );
}

if (immediats.length > 0) {
  md.push(
    `## Mises à jour disponibles sans arbitrage`,
    ``,
    `Ces versions sont déjà autorisées par les contraintes déclarées dans le`,
    `projet : rien n'a été arbitré, elles n'ont simplement pas encore été`,
    `installées. Une seule commande de mise à jour les applique.`,
    ``,
    `| Dépendance | Installée | Disponible |`,
    `| --- | --- | --- |`,
    ...immediats.map((p) => `| \`${p.name}\` | ${p.current} | ${p.wanted} |`),
    ``,
  );
}

const table = (liste) => [
  `| Dépendance | Installée | Dernière publiée | Usage |`,
  `| --- | --- | --- | --- |`,
  ...liste.map((p) => `| \`${p.name}\` | ${p.current} | ${p.latest} | ${p.type} |`),
  ``,
];

if (retards.majeur.length > 0) {
  md.push(
    `## Retard d'une version majeure`,
    ``,
    `Un changement de version majeure annonce des ruptures de compatibilité.`,
    `Ces mises à jour se planifient, elles ne se subissent pas : c'est la liste`,
    `qui mérite un arbitrage.`,
    ``,
    ...table(retards.majeur),
  );
}

if (retards.mineur.length > 0) {
  md.push(
    `## Retard d'une version mineure`,
    ``,
    `Des fonctionnalités ont été ajoutées en amont sans rupture annoncée.`,
    ``,
    ...table(retards.mineur),
  );
}

if (retards.correctif.length > 0) {
  md.push(
    `## Retard d'un correctif`,
    ``,
    `Corrections de bugs uniquement, sans changement d'interface.`,
    ``,
    ...table(retards.correctif),
  );
}

if (retenues.length > 0) {
  md.push(
    `## Retenues volontaires`,
    ``,
    `Une version plus récente existe, mais le projet la tient à dessein. Ce`,
    `n'est pas un retard : la raison est donnée pour chacune.`,
    ``,
    ...(retenues.some((p) => robot.has(p.name))
      ? [
          `Les raisons se lisent ainsi. « SDK Expo x : plage » : le kit Expo de`,
          `l'application mobile, en version x, fixe cette plage, et une version hors`,
          `plage casse la construction native. « correctif local » : le projet`,
          `corrige ce paquet, et le correctif ne vaut que pour la version installée.`,
          `« nom : plage » : une autre dépendance n'accepte que cette plage. « exige`,
          `nom plage » : la version plus récente exigerait d'une autre dépendance une`,
          `version qu'elle ne peut pas encore prendre.`,
          ``,
        ]
      : []),
    `| Dépendance | Installée | Dernière publiée | Raison |`,
    `| --- | --- | --- | --- |`,
    ...retenues.map((p) => `| \`${p.name}\` | ${p.current} | ${p.latest} | ${cellule(p.raison)} |`),
    ``,
  );
}

// Les briques externes rejoignent le meme document : l import declenche le
// relevé (le module utilise une attente de haut niveau). Charge ici seulement,
// pour que --selftest n aille pas interroger le reseau.
const { sectionExternes } = await import("./check-externes.mjs");
md.push(...sectionExternes);

// Inventaire complet : la question « sur quelle version sommes-nous, et quelle
// est la derniere publiee » doit avoir une reponse pour CHAQUE dependance, pas
// seulement pour celles qui sont en retard. Une dependance absente du releve de
// retard est, par definition des deux outils, deja a sa derniere version.
if (directes.size > 0) {
  const retardParNom = new Map();
  for (const p of vus.values()) if (!retardParNom.has(p.name)) retardParNom.set(p.name, p);

  const lignes = [...directes.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([nom, info]) => {
      const r = retardParNom.get(nom);
      const derniere = r?.latest || info.version;
      const a = r ? ampleur(r.current, r.latest) : null;
      let etat = a ? `retard ${a}` : "à jour";
      if (a && retenusParNom.has(nom)) etat = "retenue volontaire";
      return `| \`${nom}\` | ${r?.current || info.version} | ${derniere} | ${etat} | ${info.type} |`;
    });

  md.push(
    `## Inventaire complet des dépendances directes`,
    ``,
    `Chaque bibliothèque déclarée par le projet, la version réellement`,
    `installée et la dernière version publiée par son auteur. Les lignes`,
    `marquées « à jour » sont celles où les deux coïncident.`,
    ``,
    `| Dépendance | Installée | Dernière publiée | État | Usage |`,
    `| --- | --- | --- | --- | --- |`,
    ...lignes,
    ``,
  );
}

const reportPath = resolve(process.cwd(), process.env.OUTDATED_REPORT ?? "docs/versions-dependances.md");
mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, assainir(md.join("\n")));

console.log(`Rapport : ${reportPath}`);
console.log(
  `Retard majeur ${retards.majeur.length}, mineur ${retards.mineur.length}, ` +
    `correctif ${retards.correctif.length}, retenues ${retenues.length}, ` +
    `dépréciées ${deprecies.length}, mises à jour immédiates ${immediats.length}`,
);
