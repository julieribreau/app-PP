#!/usr/bin/env node
// Audit des licences des dépendances de production.
// Politique Bullify : bloque GPL/AGPL/SSPL/OSL/EUPL, tolère LGPL/MPL/CDDL/FSL,
// et bloque toute licence absente de la politique ou non déclarée.
//
// Même fichier, à l'octet près, dans chaque dépôt Bullify : une modification se
// reporte dans tous les dépôts, sans exception ni variante locale.
//
// Usage :
//   npm query ".prod" > /tmp/lic.json                     && node scripts/check-licenses.mjs /tmp/lic.json
//   pnpm ls -r --prod --depth Infinity --json > /tmp/lic.json && node scripts/check-licenses.mjs /tmp/lic.json
//   (plusieurs fichiers acceptés, résultats fusionnés : monorepo, application mobile, Python)
//   node scripts/check-licenses.mjs --selftest
//
// Sortie : docs/licenses.md (ou LICENSE_REPORT), écrasé à chaque run, et exit 1
// si une licence est interdite ou non identifiée.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

// --- Politique ---------------------------------------------------------------

// Autorisées sans condition. Identifiants SPDX exacts : une variante
// d'écriture n'est pas reconnue et bloque, jusqu'à ce qu'on la qualifie.
// N'entre ici qu'une licence permissive portée par une dépendance réelle, sans
// autre obligation que la mention de l'auteur.
const ALLOWED_FAMILIES = new Set([
  'MIT',
  'MIT-0', // SPDX « MIT No Attribution », plus permissif que MIT
  'MIT/X11', // variante MIT (packages substack : chainsaw, traverse)
  'Apache-2.0',
  'ISC',
  'BSD-2-Clause',
  'BSD-3-Clause',
  '0BSD',
  'BlueOak-1.0.0',
  'Unlicense',
  'CC0-1.0',
  'CC-BY-3.0', // données de date-holidays, même obligation que CC-BY-4.0 : citer la source
  'CC-BY-4.0',
  'Python-2.0',
  'PSF-2.0', // premier volet de Python-2.0, seul retenu par argparse 3 (markdown-it)
  'MIT-CMU', // variante MIT/HPND : notice à conserver, rien d'autre (pillow)
  'Zlib',
]);

// Tolérées : autorisées, mais sous une condition que le rapport doit rappeler.
// Ces phrases partent telles quelles dans un document client : francais courant,
// ni emoji ni tiret typographique (cf tools/marqueurs.py de bullify-documentation).
// Les conditions valent pour la distribution : un service hébergé n'en est pas
// une, une application installée ou une image Docker remise à un client, si.
const LGPL_REASON =
  "la dépendance est chargée dynamiquement et n'est pas modifiée, ce qui satisfait l'article 4 de la LGPL ; si le logiciel est remis à un client, sa licence et l'adresse de son code source l'accompagnent";
const FICHIERS_REASON =
  "le copyleft ne porte que sur les fichiers de la bibliothèque, que le projet ne modifie pas ; si le logiciel est remis à un client, leur licence et l'adresse de leur code source l'accompagnent";
const TOLERATED_FAMILIES = new Map([
  ['LGPL-3.0-or-later', LGPL_REASON],
  ['LGPL-3.0', LGPL_REASON],
  ['LGPL-2.1-or-later', LGPL_REASON],
  ['LGPL-2.1', LGPL_REASON],
  ['MPL-2.0', FICHIERS_REASON],
  // Reprise par Sun de la MPL 1.1 : même copyleft par fichier. Seule différence,
  // la loi et les tribunaux choisis par l'auteur (souvent la Californie).
  ['CDDL-1.0', FICHIERS_REASON],
  ['CDDL-1.1', FICHIERS_REASON],
  [
    'FSL-1.1-MIT',
    'source disponible avec clause de non-concurrence, sans copyleft, et bascule en licence MIT deux ans après publication',
  ],
  [
    'FSL-1.1-Apache-2.0',
    'source disponible avec clause de non-concurrence, sans copyleft, et bascule en licence Apache-2.0 deux ans après publication',
  ],
]);

// Interdites : bloquent la CI.
const FORBIDDEN_PATTERNS = [
  /\bGPL-\d/i, // GPL-2.0, GPL-3.0… (LGPL traité avant)
  /\bAGPL/i,
  /\bSSPL/i, // Server Side Public License (MongoDB)
  /\bOSL/i, // Open Software License
  /\bEUPL/i, // European Union Public License
];

// Paquets dont la licence déclarée est absente ou inexploitable, et dont la
// licence réelle a été relevée à la main dans le dépôt d'origine. La licence
// relevée passe par la même politique que les autres : une exception ne peut
// pas faire entrer une licence que la politique refuse. N'ajouter une entrée
// qu'après vérification du dépôt amont, avec la source.
const UNKNOWN_ALLOWLIST = new Map([
  ['buffers', 'MIT/X11'], // README de substack/node-buffers, aucun champ en 0.1.1
  ['pause', 'MIT'], // README de stream-utils/pause, aucun champ en 0.0.1
  ['png-js', 'MIT'], // LICENSE du paquet (Devon Govett), aucun champ en 1.1.0 ni 2.0.0
  ['splaytree-ts', 'BSD-3-Clause'], // LICENSE du paquet ; il déclare "BDS-3-Clause", faute de frappe
  // Python : PyPI ne publie qu'un classificateur ambigu, la licence est relevée chez l'auteur.
  ['flask-sqlalchemy', 'BSD-3-Clause'], // LICENSE.txt de pallets-eco/flask-sqlalchemy
  ['mistralai', 'Apache-2.0'], // LICENSE de mistralai/client-python
  ['psycopg2-binary', 'LGPL-3.0-or-later'], // LICENSE de psycopg/psycopg2, plus une exception OpenSSL
]);

// --- Barrière de diffusion ---------------------------------------------------

// Le document peut partir dans le Drive d'un client, où tools/marqueurs.py
// refuse emoji, tirets typographiques et flèches, et annule alors la diffusion
// de TOUT le projet. Or les noms de paquets et les libellés de licences
// viennent de tiers : un seul caractère exotique en amont bloquerait la
// publication. On neutralise ici plutôt que d'y compter. Mêmes plages que
// marqueurs.py, volontairement.
const MARQUEURS = /[‐-―•←-⇿☀-➿⤀-⥿⬀-⯿️‍]|[\u{1f000}-\u{1faff}]/gu;

// Un tiret typographique devient un vrai tiret, le reste disparaît : un emoji
// remplacé par un tiret laisserait une ponctuation absurde dans une phrase.
const assainir = (texte) => texte.replace(MARQUEURS, (c) => (/[‐-―]/.test(c) ? '-' : ''));

// --- Classification ----------------------------------------------------------

const RANK = { allowed: 3, tolerated: 2, unknown: 1, forbidden: 0 };
const OPERATEURS = new Set(['AND', 'OR', '(', ')']);

// Une licence simple, hors expression SPDX.
function classerTerme(terme) {
  if (terme === '') {
    return { status: 'unknown', reason: 'aucune licence déclarée' };
  }
  // LGPL doit être écartée AVANT GPL pour ne pas être faussement bloquée.
  if (!/\bLGPL/i.test(terme) && FORBIDDEN_PATTERNS.some((re) => re.test(terme))) {
    return { status: 'forbidden', reason: `Licence interdite : ${terme}` };
  }
  if (ALLOWED_FAMILIES.has(terme)) return { status: 'allowed' };
  if (TOLERATED_FAMILIES.has(terme)) {
    return { status: 'tolerated', reason: TOLERATED_FAMILIES.get(terme) };
  }
  return { status: 'unknown', reason: `licence "${terme}" absente de la politique` };
}

// Expression SPDX, avec la précédence de la spécification : AND lie plus fort
// que OR, les parenthèses regroupent. OR : le consommateur choisit, on retient
// la plus permissive. AND : toutes s'appliquent, on retient la plus
// contraignante. Découpage en jetons plutôt que par expression régulière : pas
// de retour arrière, et les parenthèses internes sont respectées.
function evaluer(expression) {
  const jetons = String(expression).replace(/[()]/g, ' $& ').trim().split(/\s+/);
  let i = 0;
  const malformee = () => {
    throw new SyntaxError('expression SPDX mal formée');
  };
  const terme = () => {
    if (jetons[i] === '(') {
      i += 1;
      const v = ou();
      if (jetons[i] !== ')') malformee();
      i += 1;
      return v;
    }
    const mots = [];
    while (i < jetons.length && !OPERATEURS.has(jetons[i])) {
      mots.push(jetons[i]);
      i += 1;
    }
    if (mots.length === 0) malformee();
    return classerTerme(mots.join(' '));
  };
  const et = () => {
    let v = terme();
    while (jetons[i] === 'AND') {
      i += 1;
      const w = terme();
      if (RANK[w.status] < RANK[v.status]) v = w;
    }
    return v;
  };
  const ou = () => {
    let v = et();
    while (jetons[i] === 'OR') {
      i += 1;
      const w = et();
      if (RANK[w.status] > RANK[v.status]) v = w;
    }
    return v;
  };
  // Une expression mal formée, même en partie, bloque : on ne devine pas.
  try {
    const v = ou();
    if (i < jetons.length) malformee();
    return v;
  } catch (e) {
    if (!(e instanceof SyntaxError)) throw e;
    return { status: 'unknown', reason: e.message };
  }
}

function classify(license, pkgName) {
  const declaree = String(license).trim();
  const muette =
    declaree === '' ||
    declaree === 'Unknown' ||
    declaree === 'UNLICENSED' ||
    /^SEE LICENSE IN/i.test(declaree);
  const cls = muette ? classerTerme('') : evaluer(declaree);
  if (cls.status !== 'unknown') return cls;

  const relevee = UNKNOWN_ALLOWLIST.get(pkgName);
  if (relevee === undefined) {
    return {
      status: 'unknown',
      reason: `${cls.reason}. Ouvrir le dépôt d'origine et relever la licence réelle : si la politique l'autorise, l'inscrire dans la liste des exceptions vérifiées du script, sinon retirer la dépendance`,
    };
  }
  const reelle = evaluer(relevee);
  const releve = `licence ${relevee} relevée manuellement dans le dépôt d'origine, le paquet ne la déclarant pas de façon exploitable`;
  if (reelle.status === 'allowed') return { status: 'tolerated', reason: releve };
  return { ...reelle, reason: `${releve} ; ${reelle.reason}` };
}

// --- Lecture des entrées -----------------------------------------------------

// Dependances optionnelles d'autres plateformes (binaires Windows, Android,
// Linux musl...) : listees dans l'arbre, jamais installees ici, donc absentes
// de l'artefact livre. On les compte pour le dire, on ne les audite pas.
let nonInstalles = 0;

// Le champ license d'un package.json est une chaine SPDX, mais d'anciens
// paquets utilisent encore { type } ou un tableau licenses.
function licenceDe(pkg) {
  if (typeof pkg.license === 'string') return pkg.license;
  if (pkg.license?.type) return pkg.license.type;
  if (Array.isArray(pkg.licenses)) return pkg.licenses.map((l) => l.type ?? l).join(' OR ');
  return '';
}

// Retourne null quand il n'y a rien a auditer : paquet absent de cette
// plateforme, ou paquet interne au workspace (notre propre code).
function lireLicence(dossier) {
  let brut;
  try {
    brut = readFileSync(resolve(dossier, 'package.json'), 'utf8');
  } catch {
    nonInstalles += 1;
    return null;
  }
  try {
    const pkg = JSON.parse(brut);
    if (pkg.private === true) return null; // paquet du workspace, pas une dependance tierce
    return licenceDe(pkg);
  } catch {
    return '';
  }
}

// Trois formats natifs, selon le gestionnaire et sa version :
//   npm query ".prod"                    → [{ name, version, license, location, private }, ...]
//   pnpm ls --prod --depth Infinity      → [{ path, dependencies: { nom: { version, path, dependencies } } }]
//   pnpm licenses list --prod --json     → { "MIT": [{ name, versions }], ... }
// pnpm ls est le chemin privilegie pour pnpm : licenses list echoue en pnpm 11
// (ERR_PNPM_MISSING_PACKAGE_INDEX_FILE), y compris sur un store neuf.
function readPackages(path) {
  const data = JSON.parse(readFileSync(path, 'utf8'));

  if (Array.isArray(data) && data.length > 0 && data[0].location === undefined) {
    // pnpm ls : arbre par projet du workspace, la licence se lit dans chaque paquet.
    const vus = new Map();
    const parcourir = (deps) => {
      for (const [nom, n] of Object.entries(deps ?? {})) {
        if (n.version && n.path) {
          const cle = `${nom}@${n.version}`;
          if (!vus.has(cle)) {
            const license = lireLicence(n.path);
            if (license !== null) vus.set(cle, { name: nom, versions: [n.version], license });
          }
        }
        parcourir(n.dependencies);
      }
    };
    for (const projet of data) parcourir(projet.dependencies);
    return [...vus.values()];
  }

  if (Array.isArray(data)) {
    return data
      .filter((n) => n.location !== '' && !n.private) // exclut la racine et nos propres workspaces
      .map((n) => ({ name: n.name ?? '?', versions: [n.version ?? '?'], license: licenceDe(n) }));
  }

  return Object.entries(data).flatMap(([license, pkgs]) =>
    pkgs.map((p) => ({ name: p.name ?? '?', versions: p.versions ?? [], license })),
  );
}

const inputs = process.argv.slice(2);

// node scripts/check-licenses.mjs --selftest : vérifie la classification.
if (inputs[0] === '--selftest') {
  const cases = [
    ['MIT', 'x', 'allowed'],
    ['GPL-3.0-only', 'x', 'forbidden'],
    ['LGPL-3.0-or-later', 'x', 'tolerated'], // LGPL ne doit pas matcher /GPL-\d/
    ['AGPL-3.0', 'x', 'forbidden'],
    ['(MPL-2.0 OR Apache-2.0)', 'x', 'allowed'], // OR : la plus permissive
    ['CDDL-1.0', 'x', 'tolerated'], // copyleft par fichier, comme la MPL
    ['CDDL-1.1 OR GPL-2.0-only', 'x', 'tolerated'],
    ['CDDL-1.0 AND GPL-2.0-only', 'x', 'forbidden'],
    ['GPL-3.0 OR MIT', 'x', 'allowed'],
    ['MIT AND ISC', 'x', 'allowed'],
    ['MIT AND GPL-3.0', 'x', 'forbidden'], // AND : la plus contraignante
    ['(MIT OR GPL-3.0) AND ISC', 'x', 'allowed'], // parenthèses internes
    ['MIT OR GPL-3.0 AND ISC', 'x', 'allowed'], // AND lie plus fort que OR
    ['(MIT OR Apache-2.0) AND GPL-2.0', 'x', 'forbidden'],
    ['(MIT OR ISC', 'x', 'unknown'], // mal formée
    ['MIT) OR ISC', 'x', 'unknown'],
    ['MIT OR', 'x', 'unknown'], // opérande manquant : pas de choix par défaut
    ['() OR MIT', 'x', 'unknown'],
    ['Apache-2.0 WITH LLVM-exception', 'x', 'unknown'], // exception non qualifiée
    ['GPL-2.0-only WITH Classpath-exception-2.0', 'x', 'forbidden'],
    ['MIT or Apache-2.0', 'x', 'unknown'], // opérateurs SPDX en majuscules seulement
    ['Unknown', 'pause', 'tolerated'], // exception vérifiée
    ['', 'pause', 'tolerated'],
    ['Unknown', 'inconnu-xyz', 'unknown'],
    ['SEE LICENSE IN LICENSE', 'x', 'unknown'],
    ['UNLICENSED', 'x', 'unknown'],
    ['Artistic-2.0', 'x', 'unknown'], // hors politique : bloque
    ['WTFPL', 'x', 'unknown'],
    ['Hippocratic-2.1', 'x', 'unknown'], // restrictions d'usage : pas une licence libre
    ['(ISC AND CC-BY-3.0)', 'x', 'allowed'],
    ['BDS-3-Clause', 'splaytree-ts', 'tolerated'], // licence mal orthographiée, relevée à la main
    ['LGPL with exceptions', 'psycopg2-binary', 'tolerated'],
    ['GPL-3.0', 'pause', 'forbidden'], // une exception ne couvre pas une licence déclarée interdite
  ];
  for (const [lic, pkg, expected] of cases) {
    const got = classify(lic, pkg).status;
    if (got !== expected) {
      console.error(`FAIL ${lic} (${pkg}) : attendu ${expected}, obtenu ${got}`);
      process.exit(1);
    }
  }
  // Toute exception vérifiée doit elle-même passer la politique.
  for (const [nom, relevee] of UNKNOWN_ALLOWLIST) {
    const s = evaluer(relevee).status;
    if (s !== 'allowed' && s !== 'tolerated') {
      console.error(`FAIL exception ${nom} : ${relevee} est ${s}`);
      process.exit(1);
    }
  }
  if (licenceDe({ licenses: [{ type: 'MIT' }, 'Apache-2.0'] }) !== 'MIT OR Apache-2.0') {
    console.error('FAIL licenceDe : tableau licenses hérité');
    process.exit(1);
  }
  // La barrière de diffusion : un paquet tiers au nom fantaisiste ne doit pas
  // pouvoir bloquer la publication de tout un projet.
  const sale = 'un ✅ un — une → un 🚀 et ️ invisible';
  const attendu = 'un  un - une  un  et  invisible';
  if (assainir(sale) !== attendu) {
    console.error(`FAIL assainir : obtenu ${JSON.stringify(assainir(sale))}`);
    process.exit(1);
  }
  console.log(`selftest OK (${cases.length} cas + exceptions + barrière de diffusion)`);
  process.exit(0);
}

if (inputs.length === 0) {
  console.error('Usage : node scripts/check-licenses.mjs <licenses.json> [autre.json ...]');
  console.error('  pnpm : pnpm ls -r --prod --depth Infinity --json > /tmp/lic.json');
  console.error('  npm  : npm query ".prod" > /tmp/lic.json');
  process.exit(2);
}

// Dédoublonnage name@license : un monorepo multi-apps remonte les mêmes deps.
const seen = new Map();
for (const path of inputs) {
  for (const pkg of readPackages(path)) {
    const key = `${pkg.name}|${pkg.license}`;
    const prev = seen.get(key);
    if (prev) prev.versions = [...new Set([...prev.versions, ...pkg.versions])];
    else seen.set(key, { ...pkg });
  }
}

const findings = { allowed: [], tolerated: [], forbidden: [], unknown: [] };
for (const pkg of seen.values()) {
  const cls = classify(pkg.license, pkg.name);
  findings[cls.status].push({ ...pkg, ...cls });
}

// --- Rapport -----------------------------------------------------------------

const total =
  findings.allowed.length +
  findings.tolerated.length +
  findings.forbidden.length +
  findings.unknown.length;
const today = new Date().toISOString().slice(0, 10);
// Le document part dans le Drive d'un client via tools/publier.sh, qui refuse
// emoji, tirets typographiques et fleches (cf marqueurs.py). Rien de tout cela
// ici, et pas de jargon de CI : le lecteur est un auditeur, pas un dev.
const versions = (f) => f.versions.join(', ');

// Tout ce qui précède le premier `##` finit en page de garde (tools/docx) :
// la date seule, le reste va dans le corps.
const md = [
  `# Audit des licences des dépendances`,
  ``,
  `Date du relevé : ${today}`,
  ``,
  `## Politique appliquée`,
  ``,
  `Ce document recense la licence de chaque dépendance de production du projet.`,
  `Chacune est classée selon la famille de sa licence : ce tableau fixe ce que`,
  `le projet a le droit d'utiliser, le verdict et l'inventaire qui suivent en`,
  `découlent.`,
  ``,
  `Le relevé porte sur les dépendances du code. Il ne couvre pas le système des`,
  `images Docker (Alpine, Debian), dont les composants ont leurs propres`,
  `licences : si une image est remise à un client, elles l'accompagnent aussi.`,
  ``,
  `| Famille de licences | Décision | Motif |`,
  `| --- | --- | --- |`,
  `| MIT, Apache-2.0, BSD, ISC et assimilées | Autorisée | Seule la mention de l'auteur est à conserver dans ce qui est distribué |`,
  `| LGPL | Autorisée sous condition | Copyleft faible, satisfait par le chargement dynamique standard de Node. Si le logiciel est remis à un client, la licence et l'adresse du code source de la bibliothèque l'accompagnent |`,
  `| MPL-2.0, CDDL | Autorisée sous condition | Copyleft limité aux fichiers de la bibliothèque, que le projet ne modifie pas. Si le logiciel est remis à un client, leur licence et l'adresse de leur code source l'accompagnent |`,
  `| FSL-1.1 | Autorisée sous condition | Source disponible, clause de non-concurrence, bascule en licence permissive après deux ans |`,
  `| GPL, AGPL, SSPL, OSL, EUPL | Interdite | Contamine l'ensemble du produit et obligerait à en publier les sources |`,
  `| Licence absente ou non reconnue | Bloquante | Une dépendance sans licence identifiée n'est pas utilisable légalement |`,
  ``,
  `### Vocabulaire`,
  ``,
  `- **Licence permissive** (MIT, Apache-2.0, BSD, ISC) : le code peut être`,
  `  intégré à un produit fermé et commercial. Seule la mention de l'auteur doit`,
  `  être conservée.`,
  `- **Copyleft** : le code est libre d'usage, mais un produit qui l'intègre et`,
  `  qui est diffusé doit être publié sous la même licence, code source compris.`,
  `- **Copyleft fort** (GPL, AGPL, SSPL) : l'obligation couvre tout le produit.`,
  `  La GPL s'applique dès que le logiciel est remis à quelqu'un, une application`,
  `  mobile par exemple ; l'AGPL dès qu'il est proposé comme service en ligne ; la`,
  `  SSPL s'étend à toute l'infrastructure qui fait tourner ce service.`,
  `- **Copyleft faible** (LGPL, MPL-2.0, CDDL) : l'obligation se limite à la`,
  `  bibliothèque elle-même, ou à ses seuls fichiers pour la MPL et la CDDL. Le`,
  `  code du projet qui s'en sert n'est pas concerné.`,
  `- **Distribution** : remettre le logiciel à un tiers, par exemple une`,
  `  application installée sur un téléphone ou une image Docker livrée chez un`,
  `  client. C'est elle qui déclenche les obligations des licences, sauf pour`,
  `  l'AGPL et la SSPL qui visent aussi le service en ligne. Un service hébergé`,
  `  sur les serveurs de Bullify n'est pas une distribution.`,
  `- **Double licence** (par exemple « MIT OR GPL-3.0-or-later ») : l'auteur`,
  `  laisse le choix entre les deux, et le projet retient la plus permissive.`,
  `- **Licences cumulées** (par exemple « MIT AND Zlib ») : les deux`,
  `  s'appliquent, et la plus contraignante décide du statut.`,
  ``,
  `## Verdict`,
  ``,
  `Dépendances de production analysées : ${total}. Le relevé est refait à chaque`,
  `modification des dépendances, sans intervention humaine.`,
  ``,
  ...(nonInstalles > 0
    ? [
        `Écartées : ${nonInstalles} dépendances optionnelles propres à d'autres`,
        `plateformes (binaires Windows, Android, Linux musl). Elles ne sont pas`,
        `installées et ne font donc pas partie de l'artefact livré.`,
        ``,
      ]
    : []),
  `| Statut | Dépendances |`,
  `| --- | --- |`,
  `| Autorisée sans condition | ${findings.allowed.length} |`,
  `| Autorisée sous condition | ${findings.tolerated.length} |`,
  `| Interdite | ${findings.forbidden.length} |`,
  `| Non identifiée | ${findings.unknown.length} |`,
  ``,
];

if (findings.forbidden.length === 0 && findings.unknown.length === 0) {
  md.push(
    `Aucune dépendance ne porte de licence interdite, et aucune licence n'est`,
    `restée non identifiée. Le projet est livrable en l'état au regard des`,
    `licences de ses composants.`,
    ``,
  );
} else {
  md.push(
    `Ce relevé signale ${findings.forbidden.length} licence(s) interdite(s) et`,
    `${findings.unknown.length} licence(s) non identifiée(s). Tant qu'elles n'ont`,
    `pas été traitées, le projet n'est pas livrable en l'état et l'intégration`,
    `continue reste en échec.`,
    ``,
  );
}

if (findings.forbidden.length > 0) {
  md.push(
    `## Licences interdites`,
    ``,
    `Ces dépendances ne peuvent pas être utilisées. Chacune doit être remplacée`,
    `par une alternative, ou retirée.`,
    ``,
    `| Dépendance | Version | Licence | Motif |`,
    `| --- | --- | --- | --- |`,
    ...findings.forbidden.map(
      (f) => `| \`${f.name}\` | ${versions(f)} | ${f.license} | ${f.reason} |`,
    ),
    ``,
  );
}

if (findings.unknown.length > 0) {
  md.push(
    `## Licences non identifiées`,
    ``,
    `Ces dépendances ne déclarent pas de licence exploitable automatiquement.`,
    `Chacune demande une vérification manuelle du dépôt d'origine avant d'être`,
    `considérée comme utilisable.`,
    ``,
    `| Dépendance | Version | Licence déclarée | À faire |`,
    `| --- | --- | --- | --- |`,
    ...findings.unknown.map(
      (f) => `| \`${f.name}\` | ${versions(f)} | ${f.license || 'aucune'} | ${f.reason} |`,
    ),
    ``,
  );
}

if (findings.tolerated.length > 0) {
  md.push(
    `## Dépendances autorisées sous condition`,
    ``,
    `Ces licences imposent une obligation que le projet respecte. La condition`,
    `est rappelée pour chacune : elle doit être revérifiée si l'usage de la`,
    `dépendance change.`,
    ``,
    `| Dépendance | Version | Licence | Condition respectée |`,
    `| --- | --- | --- | --- |`,
    ...findings.tolerated.map(
      (f) => `| \`${f.name}\` | ${versions(f)} | ${f.license || 'non déclarée'} | ${f.reason} |`,
    ),
    ``,
  );
}

const byLicense = {};
for (const f of findings.allowed) byLicense[f.license] = (byLicense[f.license] ?? 0) + 1;
md.push(
  `## Répartition des licences autorisées`,
  ``,
  `Ces licences sont permissives : elles autorisent l'intégration dans un`,
  `produit propriétaire sans contrepartie autre que le maintien de la mention`,
  `de droit d'auteur.`,
  ``,
  `| Licence | Dépendances |`,
  `| --- | --- |`,
  ...Object.entries(byLicense)
    .sort(([, a], [, b]) => b - a)
    .map(([lic, n]) => `| ${lic} | ${n} |`),
  ``,
  `## Inventaire complet des dépendances`,
  ``,
  `Chaque dépendance de production, sa version et la licence sous laquelle`,
  `elle est distribuée. C'est la pièce qu'un auditeur demande pour vérifier`,
  `la synthèse ci-dessus ligne par ligne.`,
  ``,
  `| Dépendance | Version | Licence | Statut |`,
  `| --- | --- | --- | --- |`,
  ...[
    ...findings.forbidden.map((f) => ({ ...f, statut: 'interdite' })),
    ...findings.unknown.map((f) => ({ ...f, statut: 'non identifiée' })),
    ...findings.tolerated.map((f) => ({ ...f, statut: 'sous condition' })),
    ...findings.allowed.map((f) => ({ ...f, statut: 'autorisée' })),
  ]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(
      (f) =>
        `| \`${f.name}\` | ${f.versions.join(', ') || '?'} | ${f.license || 'non déclarée'} | ${f.statut} |`,
    ),
  ``,
);

const propre = assainir(md.join('\n'));

const reportPath = resolve(process.cwd(), process.env.LICENSE_REPORT ?? 'docs/licenses.md');
mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, propre);

console.log(`Rapport : ${reportPath}`);
console.log(
  `Total ${total} — autorisées ${findings.allowed.length}, tolérées ${findings.tolerated.length}, ` +
    `interdites ${findings.forbidden.length}, inconnues ${findings.unknown.length}`,
);

if (findings.forbidden.length > 0) {
  console.error(`\nLicences interdites détectées :`);
  for (const f of findings.forbidden) console.error(`  - ${f.name} : ${f.license}`);
}
if (findings.unknown.length > 0) {
  console.error(`\nLicences non identifiées :`);
  for (const f of findings.unknown) console.error(`  - ${f.name} : ${f.license || '(vide)'}`);
  console.error(
    `Relever la licence réelle dans chaque dépôt amont : UNKNOWN_ALLOWLIST si la politique l'autorise, sinon retirer la dépendance.`,
  );
}
process.exit(findings.forbidden.length + findings.unknown.length > 0 ? 1 : 0);
