#!/usr/bin/env node
// Monte les briques que package.json ne voit pas : actions GitHub, images
// Docker, et version de node et de python dans les workflows.
//
//   node scripts/maj-externes.mjs              depuis la racine du depot
//   node scripts/maj-externes.mjs --selftest
//
// Ecrit dans les fichiers et s'arrete la. La verification est celle de la
// proposition ouverte ensuite : sa CI tourne avec les nouvelles actions et le
// nouveau node, c'est elle qui dit si la montee tient.
//
// Les cibles suivent le meme critere que check-externes.mjs, qui les affiche au
// document 08 : pour un runtime, la version la plus recente passee en support
// long terme ; pour une action, la plus haute release stable.
//
// Deux exceptions, voulues :
//   - Une image de base de donnees ne change jamais de majeure ici. PostgreSQL
//     refuse de demarrer sur un volume d'une autre majeure sans pg_upgrade :
//     monter l'image, c'est une panne au deploiement suivant. Ces montees se
//     planifient avec leur migration.
//   - Une reference qui n'est pas une version (variable, `latest`, branche,
//     nom d'etape) n'est pas touchee : il n'y a rien a comparer.
//
// GH_TOKEN ou GITHUB_TOKEN : sans jeton, l'API GitHub plafonne a 60 appels par
// heure, et un depot en epingle une trentaine.
//
// Code de sortie 0 meme sans rien a faire.

import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const estPrincipal = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

// --- Versions -----------------------------------------------------------------

// "v5", "5.0.1", "26.9.0.129388" -> [5], [5,0,1]... ; null des qu'il y a un
// suffixe : une release "3.1.0-node20" est un retroportage, pas une version
// plus recente.
export function versionDe(v) {
  const m = /^v?(\d+(?:\.\d+)*)$/.exec(String(v ?? "").trim());
  return m ? m[1].split(".").map(Number) : null;
}

// Une partie absente vaut 0 : "v5" et "5.0.0" sont egales.
export function comparer(a, b) {
  const [p, q] = [versionDe(a), versionDe(b)];
  if (!p || !q) return 0;
  for (let i = 0; i < Math.max(p.length, q.length); i++) {
    const d = (p[i] ?? 0) - (q[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

// Le premier tag numerique d'une image et ce qui l'entoure :
// "22-alpine" -> ["", "22", "-alpine"], "pg16" -> ["pg", "16", ""].
export function decouperTag(tag) {
  const texte = String(tag ?? "");
  const m = /^(\D*)(\d+(?:\.\d+)*)/.exec(texte);
  if (!m) return null;
  const apres = texte.slice(m[0].length);
  // Le reste ne franchit pas une fin de ligne (le `.` de l'ancienne expression,
  // dont le `(.*)$` retournait en arriere sur une longue version non conclue).
  return /[\n\r\u2028\u2029]/.test(apres) ? null : { avant: m[1], version: m[2], apres };
}

// La nouvelle version a la meme granularite que l'ancienne : un tag "22"
// flotte sur la majeure et doit rester flottant, "3.19" reste en deux parties.
export function memeGranularite(actuelle, cible) {
  const n = actuelle.split(".").length;
  return String(cible).split(".").slice(0, n).join(".");
}

// --- Cibles : runtimes et images -----------------------------------------------

// Nom d'image vers identifiant endoflife.date. Une image absente n'est pas
// montee : mieux vaut la laisser que deviner. Meme table que check-externes.mjs.
export const PRODUITS = {
  node: "nodejs",
  postgres: "postgresql",
  "postgis/postgis": "postgresql",
  "pgvector/pgvector": "postgresql",
  redis: "redis",
  alpine: "alpine-linux",
  python: "python",
  nginx: "nginx",
  mysql: "mysql",
  mariadb: "mariadb",
  mongo: "mongodb",
  rabbitmq: "rabbitmq",
  traefik: "traefik",
  caddy: "caddy",
  ubuntu: "ubuntu",
  debian: "debian",
  "eclipse-temurin": "eclipse-temurin",
  wordpress: "wordpress",
  elasticsearch: "elasticsearch",
};

// Ce qui porte un volume de donnees : jamais de changement de majeure ici.
export const DONNEES = new Set([
  "postgresql",
  "redis",
  "mysql",
  "mariadb",
  "mongodb",
  "rabbitmq",
  "elasticsearch",
]);

// Parmi les cycles encore supportes, le plus recent deja passe en support long
// terme ; a defaut de notion LTS, le plus recent encore supporte. Un cycle dont
// la date lts est future n'est pas encore LTS. Meme critere que check-externes.
export function choisirCycle(cycles, maintenant = Date.now()) {
  if (!Array.isArray(cycles)) return null;
  const date = (v) => (typeof v === "string" ? Date.parse(v) : Number.NaN);
  // Passee : une date lisible, au plus tard maintenant. Une date illisible (ou
  // `false`) ne l'est jamais, d'ou un cycle vivant et pas encore LTS.
  const passee = (v) => date(v) <= maintenant;
  const vivant = (c) => c.eol !== true && !passee(c.eol);
  // `lts: true` sans date : mariadb, entre autres.
  const lts = (c) => c.lts === true || passee(c.lts);
  const vivants = cycles.filter(vivant);
  if (vivants.length === 0) return null;
  const retenu = (vivants.some(lts) ? vivants.filter(lts) : vivants)[0];
  return String(retenu.latest ?? retenu.cycle);
}

// La meme majeure que l'actuelle, pour une base de donnees.
export function cycleDeLaMajeure(cycles, majeure) {
  if (!Array.isArray(cycles)) return null;
  const c = cycles.find((x) => String(x.cycle).split(".")[0] === String(majeure));
  return c ? String(c.latest ?? c.cycle) : null;
}

// --- Acces reseau -------------------------------------------------------------

const cache = new Map();
async function json(url, entetes = {}) {
  if (cache.has(url)) return cache.get(url);
  let v = null;
  try {
    const r = await fetch(url, { headers: { "user-agent": "bullify-maj", ...entetes } });
    v = r.ok ? await r.json() : null;
  } catch {
    // Source injoignable : rien ne monte, rien ne casse.
  }
  cache.set(url, v);
  return v;
}

const jeton = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const gh = (chemin) =>
  json(`https://api.github.com${chemin}`, jeton ? { authorization: `Bearer ${jeton}` } : {});

// La plus haute release stable, pas la derniere publiee : un depot qui maintient
// plusieurs branches publie ses retroportages apres sa derniere majeure.
export function plusHauteStable(releases) {
  let meilleure = null;
  for (const r of releases ?? []) {
    if (r.draft || r.prerelease || !versionDe(r.tag_name)) continue;
    if (!meilleure || comparer(r.tag_name, meilleure) > 0) meilleure = r.tag_name;
  }
  return meilleure;
}

async function derniereAction(depot) {
  const rels = await gh(`/repos/${depot}/releases?per_page=100`);
  const tag = plusHauteStable(rels);
  if (tag) return tag;
  // Certaines actions ne publient que des tags, sans release.
  const tags = await gh(`/repos/${depot}/tags?per_page=100`);
  return plusHauteStable((tags ?? []).map((t) => ({ tag_name: t.name })));
}

const shaDe = async (depot, tag) => (await gh(`/repos/${depot}/commits/${tag}`))?.sha ?? null;
const tagExiste = async (depot, tag) => Boolean(await gh(`/repos/${depot}/git/ref/tags/${tag}`));

async function cycles(produit) {
  return json(`https://endoflife.date/api/${produit}.json`);
}

// Les etiquettes d'une image hors table, quel que soit son registre : Docker
// Hub, ghcr.io ou public.ecr.aws (jeton anonyme pour ces deux-la). Registre
// inconnu ou prive : aucune, et l'image ne monte pas.
// Cible `rel="next"` d'un en-tête Link (`<url>; rel="next", <url>; rel="last"`).
// Découpé à la main : `/<([^>]+)>;\s*rel="next"/` repartait de chaque « < » (S8786).
export function lienSuivant(entete) {
  for (const partie of (entete ?? "").split(",")) {
    const [cible, ...params] = partie.split(";");
    const t = cible.trim();
    if (params.some((p) => p.trim() === 'rel="next"') && t.startsWith("<") && t.endsWith(">")) {
      return t.slice(1, -1);
    }
  }
  return undefined;
}

export async function tagsImage(nom) {
  const [tete, ...reste] = nom.split("/");
  if (tete.includes(".") && reste.length) {
    const chemin = reste.join("/");
    const urlJeton = {
      "ghcr.io": `https://ghcr.io/token?scope=repository:${chemin}:pull`,
      "public.ecr.aws": "https://public.ecr.aws/token/",
    }[tete];
    const jetonRegistre = urlJeton && (await json(urlJeton))?.token;
    if (!jetonRegistre) return [];
    // Pages suivantes par l'en-tete Link (curseur opaque sur l'ECR) : sans lui,
    // openobserve s'arrete a 1000 etiquettes, et pas les plus recentes.
    const entetes = { "user-agent": "bullify-maj", authorization: `Bearer ${jetonRegistre}` };
    const tags = [];
    let url = `https://${tete}/v2/${chemin}/tags/list?n=1000`;
    for (let page = 0; url && page < 50; page++) {
      const r = await fetch(url, { headers: entetes }).catch(() => null);
      if (!r?.ok) break;
      tags.push(...((await r.json()).tags ?? []));
      const suivant = lienSuivant(r.headers.get("link"));
      url = suivant && new URL(suivant, url).href;
    }
    return tags;
  }
  const chemin = nom.includes("/") ? nom : `library/${nom}`;
  const tags = [];
  let url = `https://hub.docker.com/v2/repositories/${chemin}/tags?page_size=100`;
  for (let page = 0; url && page < 10; page++) {
    const r = await json(url);
    tags.push(...(r?.results ?? []).map((t) => t.name));
    url = r?.next;
  }
  return tags;
}

// Docker Hub seulement : une image d'un autre registre n'est pas montee.
async function imageExiste(nom, tag) {
  const chemin = nom.includes("/") ? nom : `library/${nom}`;
  return Boolean(
    await json(`https://hub.docker.com/v2/repositories/${chemin}/tags/${encodeURIComponent(tag)}`),
  );
}

// --- Actions ------------------------------------------------------------------

// uses: owner/repo[/chemin]@ref [# commentaire]. Le commentaire se lit a part,
// colle a la reference : en une seule expression, la complexite depassait le
// seuil admis.
const USES = /(uses:\s*["']?)([\w.-]+)\/([\w.-]+)((?:\/[\w./-]+)?)@([\w.-]+)(["']?)/g;
const COMMENTAIRE_USES = /[ \t]*#[ \t]*(\S+)/y;

// Chaque `uses:` du texte, avec son commentaire eventuel ; la recherche reprend
// apres le commentaire, comme le faisait l'expression unique.
export function referencesAction(texte) {
  const refs = [];
  USES.lastIndex = 0;
  for (let m = USES.exec(texte); m; m = USES.exec(texte)) {
    COMMENTAIRE_USES.lastIndex = USES.lastIndex;
    const c = COMMENTAIRE_USES.exec(texte);
    if (c) USES.lastIndex = COMMENTAIRE_USES.lastIndex;
    refs.push({ m, c });
  }
  return refs;
}

// Calcule la nouvelle reference d'une action, ou null si rien ne change.
// `resoudre` fournit derniere(depot), sha(depot, tag), existe(depot, tag) :
// injecte pour que le selftest n'appelle pas le reseau.
export async function nouvelleAction({ depot, ref, commentaire }, resoudre) {
  const derniere = await resoudre.derniere(depot);
  if (!derniere) return null;
  const formes = {
    derniere,
    v: derniere.startsWith("v") ? derniere : `v${derniere}`,
    majeure: `v${versionDe(derniere)[0]}`,
  };
  return /^[0-9a-f]{40}$/.test(ref)
    ? actionParSha({ depot, ref, commentaire }, formes, resoudre)
    : actionParTag({ depot, ref }, formes, resoudre);
}

// Epinglee par SHA : la version n'est connue que par le commentaire.
async function actionParSha({ depot, ref, commentaire }, { derniere, v, majeure }, resoudre) {
  if (!commentaire || !versionDe(commentaire)) return null;
  if (comparer(derniere, commentaire) < 0) return null;
  const sha = await resoudre.sha(depot, derniere);
  if (!sha || sha === ref) return null;
  const note = /^v?\d+$/.test(commentaire) ? majeure : v;
  return { ref: sha, commentaire: note, de: commentaire, vers: note };
}

// Epinglee par tag : sur la majeure seule, on garde la forme si le tag
// flottant existe ; sinon la version complete, avec ou sans `v` comme avant.
async function actionParTag({ depot, ref }, { derniere, v, majeure }, resoudre) {
  if (!versionDe(ref) || comparer(derniere, ref) <= 0) return null;
  if (/^v?\d+$/.test(ref)) {
    if (versionDe(derniere)[0] <= versionDe(ref)[0]) return null;
    const cible = (await resoudre.existe(depot, majeure)) ? majeure : v;
    return { ref: cible, de: ref, vers: cible };
  }
  const cible = ref.startsWith("v") ? v : v.slice(1);
  return { ref: cible, de: ref, vers: cible };
}

export async function monterActions(texte, resoudre) {
  const montees = [];
  const morceaux = [];
  let dernier = 0;
  for (const { m, c } of referencesAction(texte)) {
    const [debut, uses, owner, repo, chemin, ref, guillemet] = m;
    const tout = debut + (c?.[0] ?? "");
    const commentaire = c?.[1];
    const n = await nouvelleAction({ depot: `${owner}/${repo}`, ref, commentaire }, resoudre);
    if (!n) continue;
    const fin = n.commentaire ? ` # ${n.commentaire}` : (c?.[0] ?? "");
    morceaux.push(
      texte.slice(dernier, m.index),
      `${uses}${owner}/${repo}${chemin}@${n.ref}${guillemet}${fin}`,
    );
    dernier = m.index + tout.length;
    montees.push({ nom: `${owner}/${repo}${chemin}`, de: n.de, vers: n.vers });
  }
  morceaux.push(texte.slice(dernier));
  return { texte: morceaux.join(""), montees };
}

// --- Images et runtimes -------------------------------------------------------

// La nouvelle version d'une brique versionnee (image ou runtime), ou null.
// `resoudre.cycles(produit)` fournit les cycles endoflife.date.
export async function nouvelleVersion(produit, actuelle, resoudre) {
  const cyc = await resoudre.cycles(produit);
  const majeure = actuelle.split(".")[0];
  const cible = DONNEES.has(produit) ? cycleDeLaMajeure(cyc, majeure) : choisirCycle(cyc);
  if (!cible) return null;
  const neuve = memeGranularite(actuelle, cible);
  return comparer(neuve, actuelle) > 0 ? neuve : null;
}

// Une reference d'image en tete de ligne : `FROM [--platform=…] nom:tag` d'un
// Dockerfile, ou `[- ]image: nom:tag` d'un compose ou d'un workflow. La tete et
// le `nom:tag` se lisent en deux temps, et les blancs de tete s'arretent a la
// ligne : l'expression unique reparcourait chaque ligne vide depuis chacune des
// precedentes, et depassait le seuil de complexite.
const TETE_FROM =
  /^[\t\v\f \u00a0\u1680\u2000-\u200a\u202f\u205f\u3000\ufeff]*FROM\s+(--platform=\S+\s+)?/imy;
const TETE_IMAGE =
  /^[\t\v\f \u00a0\u1680\u2000-\u200a\u202f\u205f\u3000\ufeff]*(?:-[\t\v\f \u00a0\u1680\u2000-\u200a\u202f\u205f\u3000\ufeff]*)?image:\s*["']?/imy;
// Plusieurs segments : public.ecr.aws/zinclabs/openobserve, ghcr.io/org/nom.
const NOM_TAG = /([\w.-]+(?:\/[\w.-]+)*):([\w.-]+)/y;

// Les references d'image du texte, dans l'ordre et sans chevauchement : essayees
// a chaque debut de ligne, la recherche reprenant apres la derniere trouvee.
export function referencesImage(texte) {
  const refs = [];
  let reprise = 0;
  for (let ligne = 0; ligne <= texte.length; ligne = finDeLigne(texte, ligne) + 1) {
    if (ligne < reprise) continue;
    const r = referenceImageEn(texte, ligne);
    if (r) {
      refs.push(r);
      reprise = r.index + r.tout.length;
    }
  }
  return refs;
}

// Position de la prochaine fin de ligne a partir de `debut`, ou la longueur.
function finDeLigne(texte, debut) {
  const m = /[\n\r\u2028\u2029]/g;
  m.lastIndex = debut;
  return m.exec(texte)?.index ?? texte.length;
}

// La reference qui commence au debut de ligne `i`, ou null. Un `--platform` qui
// ne mene pas a un `nom:tag` est rendu au nom, comme le faisait l'expression.
function referenceImageEn(texte, i) {
  for (const tete of [TETE_FROM, TETE_IMAGE]) {
    tete.lastIndex = i;
    const t = tete.exec(texte);
    if (!t) continue;
    const essais = t[1] ? [t[0], t[0].slice(0, -t[1].length)] : [t[0]];
    for (const debut of essais) {
      NOM_TAG.lastIndex = i + debut.length;
      const m = NOM_TAG.exec(texte);
      if (m) return { index: i, tout: debut + m[0], tete: debut, nom: m[1], tag: m[2] };
    }
  }
  return null;
}

// « # maj-externes: tenir <raison> » sur la ligne de l'image ou juste au-dessus
// (un Dockerfile refuse un commentaire en fin de FROM) : l'image ne bouge pas.
// Vu sur transcript : py-cord exige Python < 3.14, discord-service reste en 3.13,
// et sans retenue la proposition des briques externes revenait rouge chaque nuit.
const TENIR = /#\s*maj-externes:\s*tenir/;
export function tenue(texte, index) {
  const debut = texte.lastIndexOf("\n", index - 1) + 1;
  const avant = debut > 0 ? texte.lastIndexOf("\n", debut - 2) + 1 : 0;
  const fin = texte.indexOf("\n", index);
  return TENIR.test(texte.slice(avant, fin === -1 ? texte.length : fin));
}

// La plus haute etiquette stable de meme forme que l'actuelle : meme prefixe
// (« v »), meme suffixe (« -alpine »), meme nombre de parties. Une preversion
// (« 2.0.0-rc1 ») n'a pas la meme forme et reste dehors. `memeMajeure` borne a
// la majeure actuelle.
export function plusHautTag(tags, actuel, memeMajeure = false) {
  const a = decouperTag(actuel);
  if (!a) return null;
  const parties = a.version.split(".").length;
  let meilleur = null;
  for (const t of tags ?? []) {
    const p = decouperTag(t);
    if (p?.avant !== a.avant || p.apres !== a.apres) continue;
    if (p.version.split(".").length !== parties || comparer(p.version, a.version) <= 0) continue;
    if (memeMajeure && p.version.split(".")[0] !== a.version.split(".")[0]) continue;
    if (!meilleur || comparer(p.version, decouperTag(meilleur).version) > 0) meilleur = t;
  }
  return meilleur;
}

// Hors table endoflife.date, une image qui garde des donnees ne change pas plus
// de majeure qu'une base connue : un volume ecrit par l'une n'est pas relu par
// l'autre.
const DONNEES_GENERIQUES = /(^|\/)(valkey|mariadb|mysql|mongo|minio|clickhouse|etcd)([-/]|$)/;

export async function monterImages(texte, resoudre) {
  const montees = [];
  const morceaux = [];
  let dernier = 0;
  for (const m of referencesImage(texte)) {
    const { tout, tete, nom, tag } = m;
    const court = nom.replace(/^docker\.io\/(library\/)?/, "");
    const produit = PRODUITS[court];
    const parts = decouperTag(tag);
    if (!parts || tenue(texte, m.index)) continue;
    let nouveauTag;
    if (produit) {
      const neuve = await nouvelleVersion(produit, parts.version, resoudre);
      if (!neuve) continue;
      nouveauTag = `${parts.avant}${neuve}${parts.apres}`;
      if (!(await resoudre.imageExiste(court, nouveauTag))) continue;
    } else {
      // Hors table (livekit, mailpit, openobserve...) : pas de cycle de support a
      // lire, la plus haute etiquette stable de meme forme sur son registre.
      nouveauTag = plusHautTag(await resoudre.tags(court), tag, DONNEES_GENERIQUES.test(court));
      if (!nouveauTag) continue;
    }
    morceaux.push(texte.slice(dernier, m.index), `${tete}${nom}:${nouveauTag}`);
    dernier = m.index + tout.length;
    montees.push({ nom: court, de: tag, vers: nouveauTag });
  }
  morceaux.push(texte.slice(dernier));
  return { texte: morceaux.join(""), montees };
}

// Un fichier .nvmrc ou .node-version ne contient que la version : « 22 »,
// « v22.11.0 ». Oublie, il laisse le depot a deux versions de node, celle des
// workflows et la sienne, et le lockfile ecrit par l'une n'est plus relu par
// l'autre (npm 11 contre npm 10, vu sur School-Bus).
export async function monterFichierVersion(texte, produit, resoudre) {
  const m = /^\s*v?(\d+(?:\.\d+)*)\s*$/.exec(texte);
  if (!m) return { texte, montees: [] };
  const neuve = await nouvelleVersion(produit, m[1], resoudre);
  if (!neuve) return { texte, montees: [] };
  return {
    texte: texte.replace(m[1], neuve),
    montees: [{ nom: produit === "nodejs" ? ".nvmrc" : ".python-version", de: m[1], vers: neuve }],
  };
}

// node-version: 22, python-version: "3.11", NODE_VERSION: '22'
const RUNTIME =
  /((?:node|python)-version|NODE_VERSION|PYTHON_VERSION)(:\s*["']?)(\d+(?:\.\d+)*)(["']?)/gi;

export async function monterRuntimes(texte, resoudre) {
  const montees = [];
  const morceaux = [];
  let dernier = 0;
  for (const m of texte.matchAll(RUNTIME)) {
    const [tout, cle, sep, actuelle, fin] = m;
    const produit = /node/i.test(cle) ? "nodejs" : "python";
    const neuve = await nouvelleVersion(produit, actuelle, resoudre);
    if (!neuve) continue;
    morceaux.push(texte.slice(dernier, m.index), `${cle}${sep}${neuve}${fin}`);
    dernier = m.index + tout.length;
    montees.push({ nom: cle, de: actuelle, vers: neuve });
  }
  morceaux.push(texte.slice(dernier));
  return { texte: morceaux.join(""), montees };
}

// --- Selftest -----------------------------------------------------------------

if (estPrincipal && process.argv[2] === "--selftest") {
  const maintenant = Date.parse("2026-09-22T00:00:00Z");
  const nodeCycles = [
    { cycle: "26", lts: "2026-10-28", eol: "2029-04-30", latest: "26.9.0" },
    { cycle: "25", lts: false, eol: "2026-06-01", latest: "25.9.0" },
    { cycle: "24", lts: "2025-10-28", eol: "2028-04-30", latest: "24.21.0" },
    { cycle: "22", lts: "2024-10-29", eol: "2027-04-30", latest: "22.23.2" },
  ];
  const pgCycles = [
    { cycle: "18", lts: false, eol: "2030-11-14", latest: "18.6" },
    { cycle: "16", lts: false, eol: "2028-11-09", latest: "16.10" },
  ];
  const faux = {
    cycles: async (p) => ({ nodejs: nodeCycles, postgresql: pgCycles })[p] ?? null,
    imageExiste: async () => true,
    tags: async () => [],
    derniere: async (d) =>
      ({ "actions/checkout": "v6.0.1", "a/sans-release": null, "a/retro": "v4.2.0" })[d] ?? null,
    sha: async (d, t) => (d === "actions/checkout" && t === "v6.0.1" ? "b".repeat(40) : null),
    existe: async (d, t) => d === "actions/checkout" && t === "v6",
  };
  const cas = [
    [() => versionDe("3.1.0-node20"), null],
    [() => comparer("1.10.0", "1.9.0") > 0, true],
    [() => memeGranularite("22", "24.21.0"), "24"],
    [() => memeGranularite("3.19", "3.22.2"), "3.22"],
    [() => decouperTag("pg16"), { avant: "pg", version: "16", apres: "" }],
    [() => decouperTag("16-3.4"), { avant: "", version: "16", apres: "-3.4" }],
    [() => choisirCycle(nodeCycles, maintenant), "24.21.0"], // 26 pas encore LTS
    [() => cycleDeLaMajeure(pgCycles, "16"), "16.10"],
    [
      () =>
        plusHauteStable([
          { tag_name: "v3.1.0-node20" },
          { tag_name: "v4.2.0" },
          { tag_name: "v5.0.0-beta.1", prerelease: true },
          { tag_name: "v4.10.0" },
        ]),
      "v4.10.0", // pas la derniere publiee, la plus haute
    ],
    // Une base de donnees ne change pas de majeure, meme si 18 est disponible.
    [() => nouvelleVersion("postgresql", "16", faux), null],
    // node flottant sur la majeure : 22 -> 24, pas 26 (LTS seulement le 28/10).
    [() => nouvelleVersion("nodejs", "22", { cycles: async () => nodeCycles }), "24"],
    [
      async () =>
        (
          await monterImages("FROM node:22-alpine AS base\n", {
            ...faux,
            cycles: async () => [
              { cycle: "24", lts: "2025-10-28", eol: "2028-04-30", latest: "24.21.0" },
            ],
          })
        ).texte,
      "FROM node:24-alpine AS base\n",
    ],
    [async () => (await monterImages("    image: postgres:16-alpine\n", faux)).montees.length, 0],
    [
      () => plusHautTag(["v1.9.0", "v1.9.1", "v1.10.0", "v2.0.0-rc1", "latest"], "v1.9.0"),
      "v1.10.0",
    ],
    [() => plusHautTag(["1.29", "1.30.1", "1.31", "latest"], "1.29"), "1.31"],
    [() => plusHautTag(["v1.9.0"], "v1.9.0"), null],
    [
      () => plusHautTag(["26.9.0.129388-community", "community"], "25.9.0.112764-community"),
      "26.9.0.129388-community",
    ],
    [() => comparer("v5", "5.0.0"), 0],
    [() => plusHautTag(["11.8.2", "12.0.2"], "11.4.5", true), "11.8.2"],
    [
      async () =>
        (
          await monterImages("  image: public.ecr.aws/zinclabs/openobserve:v0.14.0\n", {
            ...faux,
            tags: async (n) =>
              n === "public.ecr.aws/zinclabs/openobserve" ? ["v0.15.1", "v0.14.0"] : [],
          })
        ).texte,
      "  image: public.ecr.aws/zinclabs/openobserve:v0.15.1\n",
    ],
    [
      async () =>
        (await monterImages("  image: livekit/livekit-server:latest\n", faux)).montees.length,
      0,
    ],
    [() => tenue("RUN x\n# maj-externes: tenir py-cord\nFROM node:22-alpine\n", 38), true],
    [() => tenue("image: node:22 # maj-externes: tenir x\n", 7), true],
    [() => tenue("# maj-externes: tenir x\nRUN y\nFROM node:22\n", 30), false],
    [() => tenue("FROM node:22\n", 0), false],
    [
      async () =>
        (
          await monterImages("# maj-externes: tenir py-cord < 3.14\nFROM node:22-alpine\n", {
            ...faux,
            cycles: async () => [
              { cycle: "24", lts: "2025-10-28", eol: "2028-04-30", latest: "24.21.0" },
            ],
          })
        ).montees.length,
      0,
    ],
    [
      async () =>
        (await monterActions("      - uses: actions/checkout@" + "a".repeat(40) + " # v5\n", faux))
          .texte,
      "      - uses: actions/checkout@" + "b".repeat(40) + " # v6\n",
    ],
    [
      async () => (await monterActions("      - uses: actions/checkout@v4\n", faux)).texte,
      "      - uses: actions/checkout@v6\n",
    ],
    [
      async () =>
        (
          await monterActions(
            "  uses: github/codeql-action/init@" + "a".repeat(40) + " # v3.2.0\n",
            faux,
          )
        ).montees.length,
      0, // pas de release connue pour ce depot : rien ne bouge
    ],
    [
      async () =>
        (
          await monterRuntimes("node-version: '22'\nNODE_VERSION: 20\n", {
            cycles: async () => [
              { cycle: "24", lts: "2025-10-28", eol: "2028-04-30", latest: "24.21.0" },
            ],
          })
        ).texte,
      "node-version: '24'\nNODE_VERSION: 24\n",
    ],
    [async () => (await monterRuntimes("node-version: ${{ env.X }}\n", faux)).montees.length, 0],
    [
      async () =>
        (await monterFichierVersion("22\n", "nodejs", { cycles: async () => nodeCycles })).texte,
      "24\n",
    ],
    [
      async () =>
        (await monterFichierVersion("v22.11.0\n", "nodejs", { cycles: async () => nodeCycles }))
          .texte,
      "v24.21.0\n",
    ],
    [async () => (await monterFichierVersion("lts/*\n", "nodejs", faux)).montees.length, 0],
  ];
  let n = 0;
  for (const [f, attendu] of cas) {
    const got = await f();
    if (JSON.stringify(got) !== JSON.stringify(attendu)) {
      console.error(
        `FAIL cas ${n} : attendu ${JSON.stringify(attendu)}, obtenu ${JSON.stringify(got)}`,
      );
      process.exit(1);
    }
    n++;
  }
  console.log(`selftest OK (${n} cas)`);
  process.exit(0);
}

// --- Parcours -------------------------------------------------------------------

if (estPrincipal) {
  const resoudre = {
    cycles,
    imageExiste,
    tags: tagsImage,
    derniere: derniereAction,
    sha: shaDe,
    existe: tagExiste,
  };

  // Les fichiers suivis seulement : ni node_modules, ni les clones d'autres
  // depots que certains gardent a cote pour lecture. Chemin absolu : un `git`
  // resolu par le PATH peut etre substitue (Sonar S4036). /usr/bin/git existe
  // sur les runners Ubuntu de GitHub comme sur macOS, comme dans check-sonar.mjs.
  const suivis = execFileSync("/usr/bin/git", ["ls-files"], { encoding: "utf8" })
    .split("\n")
    .filter((f) => f && !f.startsWith(".clones/"));

  const toutes = [];
  for (const f of suivis) {
    const base = f.split("/").pop();
    const versionNue = base === ".nvmrc" || base === ".node-version" || base === ".python-version";
    const docker = /^Dockerfile/i.test(base) || /\.dockerfile$/i.test(base);
    const yaml = /\.ya?ml$/i.test(base);
    const workflow = yaml && /(^|\/)\.github\/(workflows|actions)\//.test(f);
    const compose = yaml && /compose/i.test(base);
    if (!docker && !workflow && !compose && !versionNue) continue;

    let texte;
    try {
      texte = readFileSync(f, "utf8");
    } catch {
      continue;
    }
    const avant = texte;
    const montees = [];
    if (versionNue) {
      const r = await monterFichierVersion(
        texte,
        base === ".python-version" ? "python" : "nodejs",
        resoudre,
      );
      if (r.texte !== texte) writeFileSync(f, r.texte);
      for (const m of r.montees) toutes.push({ ...m, fichier: f, exerce: false });
      continue;
    }
    for (const etape of [
      workflow ? monterActions : null,
      docker || compose || workflow ? monterImages : null,
      workflow ? monterRuntimes : null,
    ]) {
      if (!etape) continue;
      const r = await etape(texte, resoudre);
      texte = r.texte;
      montees.push(...r.montees);
    }
    if (texte !== avant) writeFileSync(f, texte);
    // Un workflow qui ne tourne pas sur pull_request (deploiement, nuit) n'est
    // pas exerce par la CI de la proposition : ce qui n'y monte que la n'est
    // verifie qu'a son prochain passage reel.
    const exerce = workflow && /\bpull_request\b/.test(avant);
    for (const m of montees) toutes.push({ ...m, fichier: f, exerce });
  }

  // Une ligne par brique et par version, pas par fichier : checkout monte dans
  // vingt workflows, la proposition n'a pas a le repeter vingt fois.
  const resume = new Map();
  for (const m of toutes) {
    const cle = `${m.nom} ${m.de} -> ${m.vers}`;
    const r = resume.get(cle) ?? { n: 0, exerce: false, fichiers: new Set() };
    r.n++;
    r.exerce ||= m.exerce;
    r.fichiers.add(m.fichier.split("/").pop());
    resume.set(cle, r);
  }
  const lignes = [...resume].map(([cle, r]) => {
    // Meme version, commit different : la majeure epinglee a recu un correctif.
    const libelle = cle.replace(/ (\S+) -> \1$/, " $1 (nouveau commit)");
    const combien = r.n > 1 ? `  (${r.n} endroits)` : "";
    const alerte = r.exerce
      ? ""
      : `  [non verifie par la CI de la proposition : ${[...r.fichiers].join(", ")}]`;
    return `  ${libelle}${combien}${alerte}`;
  });
  for (const l of lignes) console.log(l);
  console.log(
    `${resume.size} brique(s) externe(s) montee(s), ${toutes.length} ligne(s) modifiee(s).`,
  );
  // Le resume sert de corps a la proposition : le workflow nomme son fichier.
  // Sans EXTERNES_RESUME (lancement a la main), les lignes ci-dessus suffisent,
  // et rien ne s'ecrit a un chemin fixe d'un repertoire partage (Sonar S5443).
  if (process.env.EXTERNES_RESUME) {
    writeFileSync(process.env.EXTERNES_RESUME, lignes.join("\n") + "\n");
  }
}
