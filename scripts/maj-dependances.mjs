#!/usr/bin/env node
// Monte chaque dependance directe a la version la plus recente qui soit stable
// et compatible avec les pairs que declarent les autres dependances du depot.
//
//   node scripts/maj-dependances.mjs package.json apps/web/package.json
//   node scripts/maj-dependances.mjs --selftest
//
// Ce script ecrit dans les package.json et s'arrete la. C'est au workflow
// d'installer, et a la CI de la proposition de verifier.
//
// Les pairs, parce que chaque paquet choisi isolement ne suffit pas : le
// 2026-09-22, TypeScript 7.0.2 venait de sortir et typescript-eslint declarait
// `typescript: >=4.8.4 <6.1.0`. Monter TypeScript cassait le lint, et la
// proposition entiere, trente autres montees comprises, restait rouge chaque
// nuit. Un paquet retenu par un pair reste a la plus haute version compatible,
// et la proposition dit qui le retient : le retard reste visible.
//
// Dans un depot pnpm, pnpm-workspace.yaml fixe aussi des versions que les
// package.json ne montrent pas, et le script les lit :
//   - catalog : la version vit la, le package.json ne porte que `catalog:`.
//     Elle est montee sur place.
//   - overrides : la version forcee l'emporte sur celle du package.json.
//     Monter l'une sans l'autre annoncerait une montee qui n'a pas lieu.
//   - patchedDependencies : un correctif local rattache a `nom@version` cesse
//     de s'appliquer des que la version change, et simr a allowUnusedPatches :
//     pas d'erreur, le correctif disparait. Ces paquets ne montent jamais ici ;
//     la proposition dit lesquels, leur montee se fait avec le correctif.
//
// SANS_MAJEURES=1 : borne chaque paquet a sa plage sans rupture, celle de `^`
// (la majeure, la mineure en 0.x). Une seule
// migration non faite suffit sinon a retenir tout le lot : sur draveil, zod 3
// vers 4 rendait rouge une proposition qui portait 48 autres montees sans
// rupture. Le passage nocturne en ouvre donc deux, l'une sans rupture qui doit
// passer, l'autre avec les majeures, rouge tant que la migration reste a faire.
// Les majeures ecartees sont listees dans la premiere.
//
// CARENCE_JOURS (0 par defaut) : ecarte les versions publiees depuis moins de
// N jours. Decision du 2026-09-22 : aucune carence, la derniere version stable
// est prise des sa publication. Le prix est connu : un paquet compromis puis
// retire du registre dans les jours qui suivent sa publication (event-stream,
// les comptes de mainteneurs voles de 2025) serait installe avant son retrait.
// Remettre une valeur ici rouvre cette fenetre de protection.
//
// SIMULER=1 : tout calculer, ne rien ecrire (ni package.json, ni
// pnpm-workspace.yaml). Pour l'audit de nuit (dependances.yml), qui veut savoir
// ce que le robot retient sans rien monter.
//
// RETENUES_JSON=<fichier> : la liste des retenues, [{nom, garde, disponible,
// raison}], ajoutee au fichier s'il existe (un depot lance le script deux fois,
// bullify-documentation et son starter/). Ce sont les paquets tenus (SDK Expo,
// correctif local) et ceux que l'arbitrage des pairs retient ; les majeures
// ecartees par SANS_MAJEURES n'en sont pas, elles attendent la proposition des
// majeures. check-outdated.mjs les range en « Retenues volontaires » au lieu de
// les compter en retard : le 08 de simr annoncait 7 majeures et 14 mineures de
// retard, toutes tenues par le SDK Expo 57.
//
// Code de sortie 0 meme sans rien a faire : l'absence de montee n'est pas une
// erreur.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { choisirCycle } from "./maj-externes.mjs";

const estPrincipal = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

// --- Semver, le strict necessaire --------------------------------------------

// Pas de dependance `semver` : le script tourne avant toute installation, et
// le registre ne rend que des versions bien formees.
export function version(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)(?:[-+](.*))?$/.exec(String(v ?? "").trim());
  return m ? { x: +m[1], y: +m[2], z: +m[3], pre: m[4] ?? "" } : null;
}

// Negatif, nul ou positif. Une preversion n'est jamais comparee ici : elle est
// ecartee avant.
export function comparer(a, b) {
  const [p, q] = [version(a), version(b)];
  if (!p || !q) return 0;
  return p.x - q.x || p.y - q.y || p.z - q.z;
}

// Le prefixe porte l'intention du mainteneur : ^ accepte les mineures, ~ les
// correctifs, rien du tout epingle. La montee le respecte au lieu de l'effacer.
//
// Une version partielle (`^20`, `~1.2`) compte : ticketing declarait
// `"@types/node": "^20"`, le passage l'ignorait, et la contrainte de vitest 5
// sur lui lui echappait. `parties` garde la granularite pour l'ecriture.
export function prefixeDe(spec) {
  const m = /^([~^]?)(\d+)(?:\.(\d+))?(?:\.(\d+))?([-+][\w.]+)?$/.exec(String(spec ?? "").trim());
  if (!m) return null;
  // Le premier groupe optionnel capture avant le second : m[4] suppose m[3].
  const parties = 1 + [m[3], m[4]].filter((x) => x !== undefined).length;
  return { prefixe: m[1], version: `${m[2]}.${m[3] ?? 0}.${m[4] ?? 0}${m[5] ?? ""}`, parties };
}

// Sans rupture de b vers a : meme plage que `^`. En 0.x la mineure fait office
// de majeure (@stripe/stripe-react-native 0.66 vers 0.77 est passe dans la
// proposition sans rupture de simr), en 0.0.x chaque correctif.
export function sansRupture(a, b) {
  const [p, q] = [version(a), version(b)];
  if (!p || !q) return false;
  if (p.x !== q.x) return false;
  return p.x > 0 || (p.y === q.y && (p.y > 0 || p.z === q.z));
}

// Une app Expo ne choisit pas la version de ses modules natifs : le SDK la fixe
// (bundledNativeModules.json, ce qu'applique `expo install --fix`). Au-dela, le
// JS passe les tests mais le natif ne correspond plus, et le build EAS ou l'app
// cassent sans que la CI le voie (School-Bus #84 : 8 modules hors du SDK 57).
// Une seconde table, les relatedPackages de l'API Expo, fixe l'outillage
// (typescript ~6.0.3, jest ~29.7.0, @types/jest, @babel/core) : sans elle, #75
// montait typescript 7 et jest 30 dans mobile/, qu'expo-doctor refuse.
// Les plages (`~x.y.z`, `^x.y.z`, `x.y.z`) se lisent avec `satisfait`.
// ponytail: borne globale au depot (un seul react) ; par package.json si un
// monorepo mele une app Expo et un paquet qui exige la majeure suivante.
//
// Sauf `expo.install.exclude` : un package.json y range les modules qu'il
// sort de la table a dessein, et `expo install --fix` comme expo-doctor les
// laissent. Le robot les bornait quand meme : sur simr, @sentry/react-native
// (8.19.0 pour une table en ~7.11.0) et @stripe/stripe-react-native (0.66.0,
// table en 0.64.0), exclus, restaient retenus « SDK Expo » (28/09). Ils
// suivent la regle generale.
async function tableSdkExpo(versionExpo) {
  const [natifs, versions] = await Promise.all([
    fetch(`https://cdn.jsdelivr.net/npm/expo@${versionExpo}/bundledNativeModules.json`),
    fetch("https://api.expo.dev/v2/versions/latest"),
  ]);
  if (!natifs.ok || !versions.ok)
    throw new Error(
      `tables du SDK Expo ${versionExpo} introuvables (${natifs.status}, ${versions.status})`,
    );
  const sdk = `${versionExpo.split(".")[0]}.0.0`;
  const lies = (await versions.json()).data?.sdkVersions?.[sdk]?.relatedPackages;
  if (!lies) throw new Error(`relatedPackages du SDK Expo ${sdk} introuvables`);
  return { ...lies, ...(await natifs.json()) };
}

// Les paquets que les package.json sortent de la table du SDK.
export function exclusExpo(pkgs) {
  const exclus = pkgs.flatMap((pkg) => pkg?.expo?.install?.exclude ?? []);
  return new Set(exclus.filter((n) => typeof n === "string"));
}

// La plage que le SDK impose a `nom`, ou null. Les paquets @react-native/*
// sortent avec react-native et suivent sa version (metro-config 0.87 sur un
// react-native 0.86 fixe par le SDK : #7 du gabarit).
export function plageDuSdk(nom, sdk, exclus = new Set()) {
  if (!sdk || nom === "expo" || exclus.has(nom)) return null;
  const rn = sdk["react-native"]?.replace(/^[~^]/, "");
  return sdk[nom] ?? (rn && nom.startsWith("@react-native/") ? `~${rn}` : null);
}

// Ce que le SDK et un correctif local laissent des candidates d'un paquet, et
// pourquoi. Le correctif se juge sur la liste d'avant le SDK : react-native-maps,
// corrige en 1.29.8 au-dessus de la 1.27.2 du SDK, n'avait plus de candidate
// une fois la table appliquee, et le 08 n'en donnait que la table pour raison.
export function tenir(nom, liste, { plage, versionSdk, corrige, garde }) {
  const tenus = [];
  let reste = liste;
  if (plage && reste.length && !satisfait(reste[0], plage)) {
    tenus.push({ nom, disponible: reste[0], garde, par: [`SDK Expo ${versionSdk} : ${plage}`] });
    reste = reste.filter((v) => satisfait(v, plage));
  }
  if (corrige && liste.length) {
    tenus.push({
      nom,
      disponible: liste[0],
      garde,
      par: [`correctif local ${corrige.fichier}, rattaché à ${corrige.version}`],
    });
  }
  return { liste: corrige ? [] : reste, tenus };
}

// La nouvelle spec, a la granularite de l'ancienne : `^20` devient `^24`, pas
// `^24.13.6`, la plage que le mainteneur avait choisie reste de meme largeur.
export const ecrire = (p, cible) => `${p.prefixe}${cible.split(".").slice(0, p.parties).join(".")}`;

// Un spec qui ne designe pas une version du registre : workspace, lien local,
// depot git, archive. On n'y touche pas, le registre n'en sait rien.
export const estDuRegistre = (spec) => typeof spec === "string" && prefixeDe(spec) !== null;

// --- pnpm-workspace.yaml ------------------------------------------------------

// Les entrees des trois sections qui fixent des versions. Les sections sont des
// dictionnaires plats (`  'nom': 'version'`) : pas besoin d'un lecteur YAML
// complet pour elles, et le script tourne avant toute installation.
export function lireEspace(texte) {
  const sections = { catalog: [], overrides: [], patchedDependencies: [] };
  let courante = null;
  texte.split("\n").forEach((ligne, i) => {
    const tete = /^([a-zA-Z][\w-]*):\s*(#.*)?$/.exec(ligne);
    if (tete) {
      courante = sections[tete[1]] ? tete[1] : null;
      return;
    }
    if (/^\S/.test(ligne)) courante = null;
    if (!courante) return;
    const e = entreeEspace(ligne);
    if (e) sections[courante].push({ ...e, ligne: i });
  });
  return sections;
}

// `  'nom': 'valeur'  # commentaire` -> { cle, valeur } ; null pour toute autre
// forme. Lu pas a pas : l'expression unique qui le faisait retournait en
// arriere de facon polynomiale sur une longue ligne qui ne concluait pas.
// La cle est la plus courte qui laisse une valeur lisible derriere ses
// deux-points ; entre guillemets d'abord, nue ensuite.
export function entreeEspace(ligne) {
  const indentation = /^\s+/.exec(ligne)?.[0].length;
  if (!indentation) return null;
  const premier = ligne[indentation];
  const guillemets = premier === "'" || premier === '"' ? [premier, ""] : [""];
  for (const q of guillemets) {
    const e = premiereEntree(ligne, indentation + q.length, q);
    if (e) return e;
  }
  // `  : v` : l'indentation cede son dernier blanc, qui devient la cle.
  return premier === ":" && indentation > 1 ? premiereEntree(ligne, indentation - 1, "") : null;
}

// A partir de `debut`, la cle la plus courte fermee par `q:` qui laisse une
// valeur lisible. Une cle ne franchit pas une fin de ligne.
function premiereEntree(ligne, debut, q) {
  for (
    let fin = ligne.indexOf(`${q}:`, debut + 1);
    fin !== -1;
    fin = ligne.indexOf(`${q}:`, fin + 1)
  ) {
    const cle = ligne.slice(debut, fin);
    if (/[\r\u2028\u2029]/.test(cle)) return null;
    const valeur = valeurEspace(ligne.slice(fin + q.length + 1));
    if (valeur !== null) return { cle, valeur };
  }
  return null;
}

// Ce qui suit les deux-points : une valeur nue ou entre guillemets, sans
// guillemet ni `#` en son sein, puis un commentaire facultatif qui court
// jusqu'au bout de la ligne.
function valeurEspace(reste) {
  const diese = reste.indexOf("#");
  if (diese !== -1 && /[\r\u2028\u2029]/.test(reste.slice(diese))) return null;
  const brut = (diese === -1 ? reste : reste.slice(0, diese)).trim();
  const q = brut[0];
  if ((q === "'" || q === '"') && brut.length >= 2 && brut.at(-1) === q) {
    const interieur = brut.slice(1, -1);
    return /['"]/.test(interieur) ? null : interieur.trim();
  }
  return /['"]/.test(brut) ? null : brut;
}

// Un override sur un simple nom de paquet ; les selecteurs (`a>b`, `a@<2`)
// visent un cas precis et restent a la main.
export const overrideSimple = (cle) => /^(@[\w.-]+\/)?[\w.-]+$/.test(cle);

// Un correctif rattache a une version : `nom@1.2.3` -> nom. Un correctif sans
// version suit le paquet, et echouerait bruyamment s'il ne s'appliquait plus.
export function paquetCorrige(cle) {
  const debut = cle.startsWith("@") ? 1 : 0;
  const arobase = cle.indexOf("@", debut);
  if (arobase <= debut) return null;
  const version = cle.slice(arobase + 1);
  if (!/^\d+\.\d+\.\d+/.test(version) || /[\n\r\u2028\u2029]/.test(version)) return null;
  return { nom: cle.slice(0, arobase), version };
}

// --- Plages de versions ----------------------------------------------------------

// "6", "6.x", "6.1", "*", "1.2.3-rc.0" -> [6, null, null]... ; null si illisible.
// Un joker ou une partie absente vaut null.
// Lu par morceaux : une seule expression depassait la complexite admise.
function parties(s) {
  const t = s.trim();
  const sansV = t.startsWith("v") ? t.slice(1) : t;
  const tiret = sansV.indexOf("-");
  if (tiret !== -1 && !/^[\w.]+$/.test(sansV.slice(tiret + 1))) return null;
  const morceaux = (tiret === -1 ? sansV : sansV.slice(0, tiret)).split(".");
  if (morceaux.length > 3 || !morceaux.every((p) => /^(?:\d+|[xX*])$/.test(p))) return null;
  const n = (p) => (p === undefined || /[xX*]/.test(p) ? null : +p);
  return [n(morceaux[0]), n(morceaux[1]), n(morceaux[2])];
}

const cmp = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

// La premiere version au-dela d'une version partielle : 6 -> 7.0.0,
// 6.1 -> 6.2.0, 6.1.2 -> 6.1.3. C'est ce que valent `>6` et `<=6` en semver.
function suivante([a, b, c]) {
  if (b === null) return [a + 1, 0, 0];
  if (c === null) return [a, b + 1, 0];
  return [a, b, c + 1];
}

// La borne haute de `^` : ^1.2.3 < 2.0.0, ^0.2.3 < 0.3.0, ^0.0.3 < 0.0.4,
// ^0.x < 1.0.0.
function hautDuChapeau([a, b, c]) {
  if (a > 0 || b === null) return [a + 1, 0, 0];
  if (b > 0 || c === null) return [0, b + 1, 0];
  return [0, 0, c + 1];
}

// Un comparateur -> liste de bornes [">=" | "<", [x, y, z]]. Illisible -> aucune
// borne : une plage qu'on ne sait pas lire ne retient rien, la CI tranchera.
function bornes(jeton) {
  const m = /^(\^|~|>=|<=|>|<|=)?(.*)$/.exec(jeton);
  const op = m[1] ?? "";
  const p = parties(m[2]);
  if (typeof p?.[0] !== "number") return [];
  const [a, b, c] = p;
  const bas = [a, b ?? 0, c ?? 0];
  switch (op) {
    case "^":
      return [
        [">=", bas],
        ["<", hautDuChapeau(p)],
      ];
    case "~":
      return [
        [">=", bas],
        ["<", b === null ? [a + 1, 0, 0] : [a, b + 1, 0]],
      ];
    case ">=":
      return [[">=", bas]];
    case "<":
      return [["<", bas]];
    case ">":
      return [[">=", suivante(p)]];
    case "<=":
      return [["<", suivante(p)]];
    default:
      // "6", "6.1", "6.1.2" ou "=6.1.2" : tout ce que la version partielle couvre.
      return [
        [">=", bas],
        ["<", suivante(p)],
      ];
  }
}

// La version satisfait-elle la plage ? ||, comparateurs, ^, ~, jokers et a - b :
// ce que les peerDependencies utilisent reellement.
export function satisfait(v, plage) {
  const t = version(v);
  if (!t) return false;
  const tv = [t.x, t.y, t.z];
  return String(plage)
    .split("||")
    .some((alternative) => {
      const s = alternative.trim();
      const tiret = /^(\S+)\s+-\s+(\S+)$/.exec(s);
      const jetons = tiret
        ? [`>=${tiret[1]}`, `<=${tiret[2]}`]
        : s
            .replace(/(>=|<=|>|<|=|\^|~)\s+/g, "$1")
            .split(/\s+/)
            .filter(Boolean);
      return jetons.every((j) =>
        bornes(j).every(([op, x]) => (op === ">=" ? cmp(tv, x) >= 0 : cmp(tv, x) < 0)),
      );
    });
}

// --- Choix de la version ------------------------------------------------------

// Les versions candidates, de la plus haute a la plus basse : stables, publiees
// depuis assez longtemps, et pas au-dela de `latest` (un canal `next` peut
// porter un numero superieur sans etre ce que le mainteneur recommande).
// `majeure`, si elle est donnee, borne le choix a cette majeure.
export function eligibles({ versions, dates, latest }, maintenant, carenceJours, majeure = null) {
  const limite = maintenant - carenceJours * 86400000;
  return versions
    .filter((v) => {
      const info = version(v);
      if (!info || info.pre) return false; // preversion : pas stable
      if (majeure !== null && info.x !== majeure) return false;
      if (latest && comparer(v, latest) > 0) return false;
      const publiee = Date.parse(dates?.[v] ?? "");
      return Number.isFinite(publiee) && publiee <= limite;
    })
    .sort((a, b) => comparer(b, a));
}

export const choisir = (...args) => eligibles(...args)[0] ?? null;

// Le point fixe. Chaque paquet part de sa meilleure candidate ; tant qu'une
// contrainte de pair la refuse, il descend a la suivante, ou reste a son
// plancher. Deux sens : un autre paquet peut exiger une plage de celui-ci, et
// celui-ci peut exiger une plage d'un autre. Les cibles ne font que baisser,
// donc la boucle termine.
//
//   noms        les dependances directes du depot
//   plancher    nom -> version declaree (la plus haute des package.json)
//   candidates  nom -> versions au-dessus du plancher, de la plus haute a la plus basse
//   pairsDe     (nom, version) -> { pair: plage }
export function arbitrer(noms, plancher, candidates, pairsDe) {
  const cible = new Map(noms.map((n) => [n, candidates.get(n)?.[0] ?? null]));
  const ctx = {
    noms,
    candidates,
    pairsDe,
    cible,
    direct: new Set(noms),
    finale: (n) => cible.get(n) ?? plancher.get(n),
  };

  jusquaStabilite(() => descendre(ctx));
  // Remontee. La descente depend de l'ordre de parcours : un paquet baisse a
  // cause d'un autre qui a ensuite baisse lui-meme n'a plus de raison de rester
  // bas. Il remonte a la plus haute candidate que rien ne refuse. C'est sur :
  // refusDe() teste les deux sens, ce que les autres exigent de lui et ce qu'il
  // exige des autres, donc une remontee acceptee ne casse personne.
  jusquaStabilite(() => remonter(ctx));

  // Ce qui est retenu sous sa meilleure candidate, et par qui.
  const retenus = [];
  for (const P of noms) {
    const meilleure = candidates.get(P)?.[0];
    if (meilleure && meilleure !== cible.get(P)) {
      retenus.push({
        nom: P,
        disponible: meilleure,
        garde: ctx.finale(P),
        par: refusDe(ctx, P, meilleure),
      });
    }
  }
  return { cible, retenus };
}

// Rejoue une etape tant qu'elle change quelque chose, vingt tours au plus.
function jusquaStabilite(etape) {
  for (let tour = 0; tour < 20; tour++) {
    if (!etape()) return;
  }
}

// Les raisons qui refusent la version v de P, dans l'etat actuel des cibles.
function refusDe(ctx, P, v) {
  const r = [];
  for (const D of ctx.noms) {
    if (D === P) continue;
    const plage = ctx.pairsDe(D, ctx.finale(D))?.[P];
    if (plage && !satisfait(v, plage)) r.push(`${D} : ${plage}`);
  }
  for (const [Q, plage] of Object.entries(ctx.pairsDe(P, v) ?? {})) {
    if (ctx.direct.has(Q) && Q !== P && !satisfait(ctx.finale(Q), plage)) {
      r.push(`exige ${Q} ${plage}`);
    }
  }
  return r;
}

// Un tour de descente : chaque paquet refuse passe a la premiere candidate
// acceptee sous sa cible, ou a son plancher. Vrai si une cible a bouge.
function descendre(ctx) {
  let change = false;
  for (const P of ctx.noms) {
    const v = ctx.cible.get(P);
    if (!v || refusDe(ctx, P, v).length === 0) continue;
    const liste = ctx.candidates.get(P) ?? [];
    const repli = liste.slice(liste.indexOf(v) + 1).find((w) => refusDe(ctx, P, w).length === 0);
    ctx.cible.set(P, repli ?? null);
    change = true;
  }
  return change;
}

// Un tour de remontee : chaque paquet prend la plus haute candidate au-dessus
// de sa cible que rien ne refuse. Vrai si une cible a bouge.
function remonter(ctx) {
  let change = false;
  for (const P of ctx.noms) {
    const liste = ctx.candidates.get(P) ?? [];
    const actuelle = ctx.cible.get(P);
    const plafond = actuelle ? liste.indexOf(actuelle) : liste.length;
    const mieux = liste.slice(0, plafond).find((w) => refusDe(ctx, P, w).length === 0);
    if (mieux) {
      ctx.cible.set(P, mieux);
      change = true;
    }
  }
  return change;
}

async function metadonnees(nom) {
  try {
    const r = await fetch(`https://registry.npmjs.org/${nom.replace("/", "%2f")}`, {
      headers: { Accept: "application/json" },
    });
    if (!r.ok) return null;
    const d = await r.json();
    return {
      versions: Object.keys(d?.versions ?? {}),
      dates: d?.time ?? {},
      latest: d?.["dist-tags"]?.latest ?? "",
      pairs: Object.fromEntries(
        Object.entries(d?.versions ?? {}).map(([v, m]) => [v, m?.peerDependencies ?? {}]),
      ),
    };
  } catch {
    // Registre injoignable : on ne monte pas, on ne casse pas.
    return null;
  }
}

// --- Selftest -----------------------------------------------------------------

// Ce que le rafraichissement du lockfile (mise-a-jour.yml) ne doit pas toucher : les
// retenus, et dans un depot Expo tout ce que le SDK fixe. Il monte dans les plages
// declarees et passait outre : un expo corrige et fige, ses voisins montes, et deux copies
// d'expo cassaient dix suites jest-expo (simr #165, 23/09). Les exclus de la table
// n'y sont pas tenus : ils montent comme les autres.
export function aFiger(retenus, noms, sdk, exclus = new Set()) {
  const figes = new Set(retenus.map((r) => r.nom));
  if (sdk) {
    for (const n of noms) {
      if (exclus.has(n)) continue;
      if (sdk[n] || n === "expo" || n.startsWith("@react-native/")) figes.add(n);
    }
  }
  return [...figes].sort((a, b) => (a < b ? -1 : 1));
}

// Les retenues pour l'audit, une entree par paquet : un meme paquet peut etre
// tenu par le SDK et retenu par un pair, ses raisons sont jointes. `garde` est
// la version que le robot laisse en place (`finale`), pas le plancher : sous le
// SDK, un paquet monte encore dans sa plage. `deja` : ce que le fichier contient
// deja, d'un premier passage.
export function retenuesPourAudit(retenus, finale, deja = []) {
  const parNom = new Map(deja.map((r) => [r.nom, { ...r, par: [r.raison] }]));
  for (const r of retenus) {
    const e = parNom.get(r.nom);
    if (!e) {
      parNom.set(r.nom, {
        nom: r.nom,
        garde: finale(r.nom),
        disponible: r.disponible,
        par: [...r.par],
      });
      continue;
    }
    e.par.push(...r.par);
    if (comparer(r.disponible, e.disponible) > 0) e.disponible = r.disponible;
  }
  return [...parNom.values()]
    .sort((a, b) => (a.nom < b.nom ? -1 : 1))
    .map(({ nom, garde, disponible, par }) => ({
      nom,
      garde,
      disponible,
      raison: [...new Set(par.filter(Boolean))].join(" ; ") || "?",
    }));
}

if (estPrincipal && process.argv[2] === "--selftest") {
  const jour = 86400000;
  const maintenant = Date.parse("2026-09-22T00:00:00Z");
  const d = (n) => new Date(maintenant - n * jour).toISOString();
  const paquet = {
    versions: ["1.0.0", "1.1.0", "1.2.0", "2.0.0", "2.1.0-rc.1", "3.0.0"],
    dates: {
      "1.0.0": d(400),
      "1.1.0": d(90),
      "1.2.0": d(2), // trop fraiche
      "2.0.0": d(30),
      "2.1.0-rc.1": d(30),
      "3.0.0": d(30), // au-dela de latest
    },
    latest: "2.0.0",
  };

  // Le cas du 2026-09-22 : typescript 7 disponible, typescript-eslint le refuse.
  const pairs = {
    "typescript-eslint@8.70.1": {
      typescript: ">=4.8.4 <6.1.0",
      eslint: "^8.57.0 || ^9.0.0 || ^10.0.0",
    },
    "typescript-eslint@8.68.0": { typescript: ">=4.8.4 <6.1.0", eslint: "^8.57.0 || ^9.0.0" },
    "plugin@2.0.0": { hote: "^3.0.0" }, // exige un hote que l'on ne peut pas monter
  };
  const pairsDe = (n, v) => pairs[`${n}@${v}`] ?? {};
  const noms = ["typescript", "typescript-eslint", "eslint", "hote", "plugin"];
  const plancher = new Map([
    ["typescript", "6.0.3"],
    ["typescript-eslint", "8.68.0"],
    ["eslint", "9.30.0"],
    ["hote", "2.4.0"],
    ["plugin", "1.0.0"],
  ]);
  const candidates = new Map([
    ["typescript", ["7.0.2", "7.0.0", "6.0.5"]],
    ["typescript-eslint", ["8.70.1"]],
    ["eslint", ["10.1.0"]],
    ["hote", []],
    ["plugin", ["2.0.0"]],
  ]);
  const { cible, retenus } = arbitrer(noms, plancher, candidates, pairsDe);
  const tsPairs = {
    "parser@8.70.1": { typescript: ">=4.8.4 <6.1.0" },
    "parser@8.64.0": { typescript: ">=4.8.4 <6.1.0" },
    "plugin@8.70.1": { parser: "^8.70.1", typescript: ">=4.8.4 <6.1.0" },
    "plugin@8.64.0": { parser: "^8.64.0", typescript: ">=4.8.4 <6.1.0" },
  };
  const triangle = arbitrer(
    ["parser", "plugin", "typescript"],
    new Map([
      ["parser", "8.64.0"],
      ["plugin", "8.64.0"],
      ["typescript", "6.0.3"],
    ]),
    new Map([
      ["parser", ["8.70.1"]],
      ["plugin", ["8.70.1"]],
      ["typescript", ["7.0.2", "6.0.5"]],
    ]),
    (n, v) => tsPairs[`${n}@${v}`] ?? {},
  );
  const espace = [
    "packages:",
    "  - apps/*",
    "overrides:",
    "  'better-auth': '1.6.33'",
    "  'foo>bar': '2.0.0'",
    "catalog:",
    "  react: ^19.1.0",
    '  "@types/node": 22.15.0 # suit le runtime',
    "patchedDependencies:",
    "  expo@57.0.14: patches/expo@57.0.14.patch",
    "  expo-location: patches/expo-location.patch",
    "allowUnusedPatches: true",
  ].join("\n");
  const sdkEssai = {
    "react-native": "0.86.3",
    "@sentry/react-native": "~7.11.0",
    "react-native-maps": "1.27.2",
  };
  const exclusEssai = new Set(["@sentry/react-native"]);

  const cas = [
    [() => comparer("1.2.3", "1.2.4"), -1],
    [() => comparer("2.0.0", "1.9.9") > 0, true],
    [() => comparer("1.10.0", "1.9.0") > 0, true], // pas une comparaison de texte
    [() => version("1.2.3-rc.1").pre, "rc.1"],
    [() => prefixeDe("^1.2.3").prefixe, "^"],
    [() => prefixeDe("1.2.3").prefixe, ""],
    [() => prefixeDe("workspace:*"), null],
    [() => estDuRegistre("~2.0.0"), true],
    [() => estDuRegistre("workspace:*"), false],
    [() => estDuRegistre("git+https://x/y.git"), false],
    [() => prefixeDe("^20"), { prefixe: "^", version: "20.0.0", parties: 1 }],
    [() => prefixeDe("~1.2"), { prefixe: "~", version: "1.2.0", parties: 2 }],
    [() => prefixeDe("15.0.0-beta.1").version, "15.0.0-beta.1"],
    [() => estDuRegistre("^20"), true],
    [() => ecrire(prefixeDe("^20"), "24.13.6"), "^24"],
    [() => ecrire(prefixeDe("~1.2"), "1.4.3"), "~1.4"],
    [() => ecrire(prefixeDe("1.2.3"), "1.3.0"), "1.3.0"],
    [() => sansRupture("1.9.0", "1.2.3"), true],
    [() => sansRupture("2.0.0", "1.2.3"), false],
    [() => sansRupture("0.66.4", "0.66.0"), true],
    [() => sansRupture("0.77.0", "0.66.0"), false],
    [() => sansRupture("0.0.4", "0.0.3"), false],
    [() => sansRupture("0.0.3", "0.0.3"), true],
    [() => satisfait("7.11.4", "~7.11.0"), true],
    [() => satisfait("7.13.0", "~7.11.0"), false],
    [() => satisfait("2.0.2", "2.0.2"), true],
    [() => satisfait("2.3.2", "2.0.2"), false],
    [() => satisfait("0.21.3", "^0.21.0"), true],
    [() => satisfait("0.22.0", "^0.21.0"), false],
    // Le coeur : 1.2.0 est trop fraiche, 2.1.0-rc.1 n'est pas stable,
    // 3.0.0 depasse latest. Reste 2.0.0.
    [() => choisir(paquet, maintenant, 7), "2.0.0"],
    [() => choisir(paquet, maintenant, 0), "2.0.0"],
    [() => choisir(paquet, maintenant, 0, 1), "1.2.0"], // borne a la majeure 1
    [() => choisir({ versions: ["1.0.0"], dates: {}, latest: "1.0.0" }, maintenant, 7), null],
    [() => eligibles(paquet, maintenant, 0), ["2.0.0", "1.2.0", "1.1.0", "1.0.0"]],

    // Plages
    [() => satisfait("6.0.5", ">=4.8.4 <6.1.0"), true],
    [() => satisfait("7.0.2", ">=4.8.4 <6.1.0"), false],
    [() => satisfait("10.1.0", "^8.57.0 || ^9.0.0 || ^10.0.0"), true],
    [() => satisfait("11.0.0", "^8.57.0 || ^9.0.0 || ^10.0.0"), false],
    [() => satisfait("0.2.9", "^0.2.3"), true],
    [() => satisfait("0.3.0", "^0.2.3"), false],
    [() => satisfait("0.0.4", "^0.0.3"), false],
    [() => satisfait("1.2.9", "~1.2"), true],
    [() => satisfait("1.3.0", "~1.2"), false],
    [() => satisfait("6.9.9", "6.x"), true],
    [() => satisfait("7.0.0", "<=6"), false],
    [() => satisfait("6.2.0", ">6.1"), true],
    [() => satisfait("6.1.9", ">6.1"), false],
    [() => satisfait("2.3.9", "1.2.3 - 2.3"), true],
    [() => satisfait("2.4.0", "1.2.3 - 2.3"), false],
    [() => satisfait("16.0.0", ">=16.0.0-0"), true],
    [() => satisfait("3.0.0", "*"), true],
    [() => satisfait("5.0.0", ">= 4.0.0 < 6"), true], // espaces apres l'operateur
    [() => satisfait("5.0.0", "workspace:*"), true], // illisible : ne retient rien

    // Arbitrage
    [() => cible.get("typescript"), "6.0.5"], // retenu sous 6.1.0 par typescript-eslint
    [() => cible.get("typescript-eslint"), "8.70.1"],
    [() => cible.get("eslint"), "10.1.0"], // accepte par ^10.0.0
    [() => cible.get("plugin"), null], // exige hote ^3, hote ne peut pas monter
    [
      () => retenus.find((r) => r.nom === "typescript")?.par,
      ["typescript-eslint : >=4.8.4 <6.1.0"],
    ],
    [() => retenus.find((r) => r.nom === "plugin")?.par, ["exige hote ^3.0.0"]],
    // Le triangle vu sur simr : le parser, parcouru d'abord, baisse parce que
    // typescript vise 7 ; typescript baisse ensuite. Le parser doit remonter,
    // et le plugin qui exige ce parser avec lui.
    [
      () => [...triangle.cible],
      [
        ["parser", "8.70.1"],
        ["plugin", "8.70.1"],
        ["typescript", "6.0.5"],
      ],
    ],
    [() => triangle.retenus.map((r) => r.nom), ["typescript"]],

    // pnpm-workspace.yaml
    [
      () => lireEspace(espace).catalog.map((e) => [e.cle, e.valeur]),
      [
        ["react", "^19.1.0"],
        ["@types/node", "22.15.0"],
      ],
    ],
    [() => lireEspace(espace).overrides.map((e) => e.cle), ["better-auth", "foo>bar"]],
    [
      () => lireEspace(espace).patchedDependencies.map((e) => e.cle),
      ["expo@57.0.14", "expo-location"],
    ],
    [() => overrideSimple("better-auth"), true],
    [() => overrideSimple("@scope/paquet"), true],
    [() => overrideSimple("foo>bar"), false],
    [() => paquetCorrige("expo@57.0.14"), { nom: "expo", version: "57.0.14" }],
    [
      () => paquetCorrige("@gorhom/bottom-sheet@5.2.14"),
      { nom: "@gorhom/bottom-sheet", version: "5.2.14" },
    ],
    [() => paquetCorrige("expo-location"), null],
    [() => aFiger([{ nom: "typescript" }], ["zod", "typescript"], null), ["typescript"]],
    [
      () =>
        aFiger(
          [{ nom: "zod" }],
          ["expo", "expo-router", "react-native", "@react-native/metro-config", "zod", "vite"],
          { "expo-router": "~57.0.14", "react-native": "0.86.2" },
        ),
      ["@react-native/metro-config", "expo", "expo-router", "react-native", "zod"],
    ],

    // expo.install.exclude : hors de la table, ni borne ni fige (simr, 28/09).
    [
      () =>
        [
          ...exclusExpo([
            { expo: { install: { exclude: ["@sentry/react-native"] } } },
            {
              expo: {
                install: { exclude: ["@sentry/react-native", "@stripe/stripe-react-native"] },
              },
            },
            { expo: { install: {} } },
            { name: "sans-expo" },
          ]),
        ].sort(),
      ["@sentry/react-native", "@stripe/stripe-react-native"],
    ],
    [() => plageDuSdk("@sentry/react-native", sdkEssai), "~7.11.0"],
    [() => plageDuSdk("@sentry/react-native", sdkEssai, exclusEssai), null],
    [() => plageDuSdk("@react-native/metro-config", sdkEssai), "~0.86.3"],
    [() => plageDuSdk("zod", sdkEssai), null],
    [() => plageDuSdk("expo", sdkEssai), null],
    [() => plageDuSdk("react-native", null), null],
    // Exclu : 8.28.0 reste candidate, rien n'est tenu.
    [
      () =>
        tenir("@sentry/react-native", ["8.28.0", "8.20.0"], {
          plage: plageDuSdk("@sentry/react-native", sdkEssai, exclusEssai),
          versionSdk: "57.0.25",
          garde: "8.19.0",
        }),
      { liste: ["8.28.0", "8.20.0"], tenus: [] },
    ],
    // Non exclu (School-Bus, ~7.11.0 declare) : tenu a la table.
    [
      () =>
        tenir("@sentry/react-native", ["8.28.0", "7.11.4"], {
          plage: plageDuSdk("@sentry/react-native", sdkEssai),
          versionSdk: "57.0.25",
          garde: "7.11.0",
        }),
      {
        liste: ["7.11.4"],
        tenus: [
          {
            nom: "@sentry/react-native",
            disponible: "8.28.0",
            garde: "7.11.0",
            par: ["SDK Expo 57.0.25 : ~7.11.0"],
          },
        ],
      },
    ],
    // Au-dessus de la table et corrige localement : les deux raisons.
    [
      () =>
        tenir("react-native-maps", ["1.29.11", "1.29.9"], {
          plage: plageDuSdk("react-native-maps", sdkEssai),
          versionSdk: "57.0.25",
          corrige: { version: "1.29.8", fichier: "patches/react-native-maps@1.29.8.patch" },
          garde: "1.29.8",
        }).tenus.map((r) => r.par[0]),
      [
        "SDK Expo 57.0.25 : 1.27.2",
        "correctif local patches/react-native-maps@1.29.8.patch, rattaché à 1.29.8",
      ],
    ],
    [
      () =>
        aFiger([], ["expo", "@sentry/react-native", "react-native-maps"], sdkEssai, exclusEssai),
      ["expo", "react-native-maps"],
    ],

    // RETENUES_JSON : une entree par paquet, raisons jointes, garde = version finale.
    [
      () =>
        retenuesPourAudit(
          [
            {
              nom: "react-native",
              disponible: "0.87.1",
              garde: "0.86.2",
              par: ["SDK Expo 57.0.14 : 0.86.2"],
            },
            {
              nom: "expo",
              disponible: "57.0.20",
              garde: "57.0.14",
              par: ["correctif local patches/expo@57.0.14.patch, rattaché à 57.0.14"],
            },
            {
              nom: "typescript",
              disponible: "7.0.2",
              garde: "6.0.3",
              par: ["SDK Expo 57.0.14 : ~6.0.3"],
            },
            ...retenus.filter((r) => r.nom === "typescript"),
          ],
          (n) => ({ typescript: "6.0.5", "react-native": "0.86.2", expo: "57.0.14" })[n],
        ),
      [
        {
          nom: "expo",
          garde: "57.0.14",
          disponible: "57.0.20",
          raison: "correctif local patches/expo@57.0.14.patch, rattaché à 57.0.14",
        },
        {
          nom: "react-native",
          garde: "0.86.2",
          disponible: "0.87.1",
          raison: "SDK Expo 57.0.14 : 0.86.2",
        },
        {
          nom: "typescript",
          garde: "6.0.5",
          disponible: "7.0.2",
          raison: "SDK Expo 57.0.14 : ~6.0.3 ; typescript-eslint : >=4.8.4 <6.1.0",
        },
      ],
    ],
    // Second passage (starter/) : ajoute au premier, sans doublon de raison.
    [
      () =>
        retenuesPourAudit(
          [{ nom: "zod", disponible: "4.1.0", garde: "3.25.0", par: ["exige x ^3"] }],
          () => "3.25.0",
          [{ nom: "zod", garde: "3.25.0", disponible: "4.0.0", raison: "exige x ^3" }],
        ),
      [{ nom: "zod", garde: "3.25.0", disponible: "4.1.0", raison: "exige x ^3" }],
    ],
    [() => retenuesPourAudit([], () => null), []],
  ];
  for (const [f, attendu] of cas) {
    const got = f();
    if (JSON.stringify(got) !== JSON.stringify(attendu)) {
      console.error(`FAIL : attendu ${JSON.stringify(attendu)}, obtenu ${JSON.stringify(got)}`);
      process.exit(1);
    }
  }
  console.log(`selftest OK (${cas.length} cas)`);
  process.exit(0);
}

// L'indentation d'un package.json : les blancs qui suivent le premier saut de
// ligne dont la suite de blancs mene a un guillemet ; 2 a defaut. Parcouru a la
// main, l'expression /\n(\s+)"/ reprenait chaque saut de ligne d'une meme suite.
export function indentationDe(brut) {
  for (let i = brut.indexOf("\n"); i !== -1;) {
    let fin = i + 1;
    while (fin < brut.length && /\s/.test(brut[fin])) fin++;
    if (fin > i + 1 && brut[fin] === '"') return fin - i - 1;
    i = brut.indexOf("\n", fin);
  }
  return 2;
}

// --- Parcours ------------------------------------------------------------------

if (estPrincipal) {
  const fichiers = process.argv.slice(2);
  if (fichiers.length === 0) {
    console.error("Usage : node scripts/maj-dependances.mjs <package.json ...>");
    process.exit(2);
  }

  const carence = Number(process.env.CARENCE_JOURS ?? 0);
  const sansMajeures = process.env.SANS_MAJEURES === "1";
  const simuler = process.env.SIMULER === "1";
  const maintenant = Date.now();

  // @types/node suit le runtime vise, pas la derniere version publiee : avec
  // les types de node 26 sur un node 24, le code peut appeler une API absente,
  // le typecheck passe et la production plante. La cible est la meme LTS que
  // celle que maj-externes.mjs donne aux images et aux workflows.
  let majeureNode;
  const bornePour = async (nom) => {
    if (nom !== "@types/node") return null;
    if (majeureNode === undefined) {
      // Sans cible connue, -1 : aucune version ne correspond, @types/node ne
      // monte pas, plutot que de viser la derniere publiee.
      majeureNode = -1;
      try {
        const r = await fetch("https://endoflife.date/api/nodejs.json");
        const cible = choisirCycle(r.ok ? await r.json() : null);
        if (cible) majeureNode = Number(cible.split(".")[0]);
      } catch {
        // endoflife.date injoignable : on reste a -1.
      }
    }
    return majeureNode;
  };

  // 1. Lecture de toutes les declarations. Un monorepo declare le meme paquet
  // dans plusieurs package.json : les pairs se jugent sur l'ensemble.
  const lus = fichiers.map((fichier) => {
    const brut = readFileSync(fichier, "utf8");
    return { fichier, brut, pkg: JSON.parse(brut) };
  });
  const BLOCS = ["dependencies", "devDependencies", "optionalDependencies"];
  const plancher = new Map();
  for (const { pkg } of lus) {
    for (const bloc of BLOCS) {
      for (const spec of Object.entries(pkg[bloc] ?? {})) {
        const [nom, s] = spec;
        const p = estDuRegistre(s) && prefixeDe(s);
        if (!p) continue;
        if (!plancher.has(nom) || comparer(p.version, plancher.get(nom)) > 0)
          plancher.set(nom, p.version);
      }
    }
  }

  // pnpm-workspace.yaml : catalogue et overrides comptent comme des
  // declarations ; les correctifs rattaches a une version tiennent le paquet.
  const CHEMIN_ESPACE = "pnpm-workspace.yaml";
  const texteEspace = existsSync(CHEMIN_ESPACE) ? readFileSync(CHEMIN_ESPACE, "utf8") : null;
  const espace = texteEspace
    ? lireEspace(texteEspace)
    : { catalog: [], overrides: [], patchedDependencies: [] };
  const entreesEspace = [
    ...espace.catalog.map((e) => ({ ...e, section: "catalog" })),
    ...espace.overrides
      .filter((e) => overrideSimple(e.cle))
      .map((e) => ({ ...e, section: "overrides" })),
  ].filter((e) => estDuRegistre(e.valeur));
  for (const e of entreesEspace) {
    const v = prefixeDe(e.valeur).version;
    if (!plancher.has(e.cle) || comparer(v, plancher.get(e.cle)) > 0) plancher.set(e.cle, v);
  }
  const corriges = new Map();
  for (const e of espace.patchedDependencies) {
    const c = paquetCorrige(e.cle);
    if (c) corriges.set(c.nom, { version: c.version, fichier: e.valeur });
  }

  // 2. Candidates de chaque paquet, au-dessus de son plancher. Un paquet
  // corrige localement n'en a aucune : il reste ou il est. `expo` passe en
  // premier : la version qu'il vise fixe la table de ses modules natifs, qui
  // borne ensuite tout le depot (un monorepo garde un seul react).
  const avecExpo = lus.some(({ pkg }) => BLOCS.some((b) => pkg[b]?.expo));
  const exclus = exclusExpo(lus.map(({ pkg }) => pkg));
  const noms = [...plancher.keys()].sort((a, b) => (b === "expo") - (a === "expo"));
  let sdk = null;
  let versionSdk = null;
  const tenus = [];
  const ecartees = [];
  const meta = new Map();
  const candidates = new Map();
  for (const nom of noms) {
    const m = await metadonnees(nom);
    if (!m) continue;
    meta.set(nom, m);
    let liste = eligibles(m, maintenant, carence, await bornePour(nom)).filter(
      (v) => comparer(v, plancher.get(nom)) > 0,
    );
    // Bornee a la plage sans rupture quand on n'en veut pas ; ce qui est
    // laisse de cote est dit, sinon le retard devient invisible.
    if (sansMajeures && liste.length && !sansRupture(liste[0], plancher.get(nom))) {
      ecartees.push({ nom, disponible: liste[0], garde: plancher.get(nom) });
      liste = liste.filter((v) => sansRupture(v, plancher.get(nom)));
    }
    if (nom === "expo" && avecExpo) {
      // La table est celle de l'expo qui sera installe. Corrige localement, il ne monte pas :
      // lire celle de sa derniere version montait react-native de 0.86.2 a 0.86.3 sous un
      // expo 57.0.14, dont la table exige 0.86.2 (simr, 23/09).
      versionSdk = corriges.has(nom) ? plancher.get(nom) : (liste[0] ?? plancher.get(nom));
      sdk = await tableSdkExpo(versionSdk);
    }
    const tenue = tenir(nom, liste, {
      plage: plageDuSdk(nom, sdk, exclus),
      versionSdk,
      corrige: corriges.get(nom),
      garde: plancher.get(nom),
    });
    tenus.push(...tenue.tenus);
    candidates.set(nom, tenue.liste);
  }

  // 3. Arbitrage des pairs.
  const arbitrage = arbitrer(noms, plancher, candidates, (n, v) => meta.get(n)?.pairs?.[v]);
  const { cible } = arbitrage;
  const retenus = [...tenus, ...arbitrage.retenus];

  // 4. Ecriture, sauf en simulation. Chaque fichier garde son indentation et son
  // saut de ligne final : un diff de mise a jour ne doit pas etre noye dans un
  // reformatage.
  const montees = [];
  for (const { fichier, brut, pkg } of lus) {
    let touche = false;
    for (const bloc of BLOCS) {
      for (const [nom, s] of Object.entries(pkg[bloc] ?? {})) {
        const p = estDuRegistre(s) && prefixeDe(s);
        const t = cible.get(nom);
        if (!p || !t || comparer(t, p.version) <= 0 || ecrire(p, t) === s.trim()) continue;
        pkg[bloc][nom] = ecrire(p, t);
        montees.push({ fichier, nom, de: p.version, vers: t });
        touche = true;
      }
    }
    if (touche && !simuler) {
      const indentation = indentationDe(brut);
      writeFileSync(
        fichier,
        JSON.stringify(pkg, null, indentation) + (brut.endsWith("\n") ? "\n" : ""),
      );
    }
  }

  // pnpm-workspace.yaml, ligne par ligne : seule la valeur change, les
  // guillemets, l'indentation et les commentaires restent.
  if (texteEspace) {
    const lignes = texteEspace.split("\n");
    let touche = false;
    for (const e of entreesEspace) {
      const p = prefixeDe(e.valeur);
      const t = cible.get(e.cle);
      if (!t || comparer(t, p.version) <= 0 || ecrire(p, t) === e.valeur) continue;
      const echappe = e.valeur.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
      lignes[e.ligne] = lignes[e.ligne].replace(
        new RegExp(String.raw`(:\s*['"]?)${echappe}`),
        `$1${ecrire(p, t)}`,
      );
      montees.push({
        fichier: `${CHEMIN_ESPACE}, ${e.section}`,
        nom: e.cle,
        de: p.version,
        vers: t,
      });
      touche = true;
    }
    if (touche && !simuler) writeFileSync(CHEMIN_ESPACE, lignes.join("\n"));
  }

  for (const m of montees) console.log(`  ${m.nom} ${m.de} -> ${m.vers}  (${m.fichier})`);
  if (retenus.length) {
    console.log("");
    console.log("Retenus :");
    for (const r of retenus) {
      console.log(
        `  ${r.nom} : ${r.disponible} disponible, garde en ${r.garde} (${r.par.join(" ; ") || "?"})`,
      );
    }
  }
  if (ecartees.length) {
    console.log("");
    console.log("Majeures disponibles, laissees a la proposition des majeures :");
    for (const e of ecartees) console.log(`  ${e.nom} : ${e.garde} -> ${e.disponible}`);
  }
  const inchangees = noms.filter((n) => !candidates.get(n)?.length).length;
  // Un nom par ligne, pour l'etape de rafraichissement du lockfile.
  if (process.env.RETENUES_FICHIER) {
    const figes = aFiger(retenus, noms, sdk, exclus);
    writeFileSync(process.env.RETENUES_FICHIER, figes.map((n) => `${n}\n`).join(""), { flag: "a" });
  }
  // Les retenues et leur raison, pour check-outdated.mjs.
  const cheminJson = process.env.RETENUES_JSON;
  if (cheminJson) {
    const deja = existsSync(cheminJson) ? JSON.parse(readFileSync(cheminJson, "utf8")) : [];
    const finale = (n) => cible.get(n) ?? plancher.get(n);
    writeFileSync(
      cheminJson,
      JSON.stringify(retenuesPourAudit(retenus, finale, deja), null, 2) + "\n",
    );
  }
  console.log(
    `${montees.length} montée(s), ${retenus.length} retenue(s), ${inchangees} déjà à jour, ` +
      (carence ? `carence de ${carence} jour(s).` : "sans carence.") +
      (simuler ? " Simulation : rien n'est écrit." : ""),
  );
}
