#!/usr/bin/env node
// Releve de qualite du code, lu sur le SonarQube mutualise (PLAN-sonarqube.md,
// phase 5). Le script n'analyse rien : il interroge une API et ecrit un
// Markdown, comme check-licenses.mjs et check-outdated.mjs dont il reprend la
// forme.
//
//   node scripts/check-sonar.mjs [.scannerwork/report-task.txt]
//
// Avec le chemin du rapport de tache, il attend que le Compute Engine ait
// digere CE scan avant de lire les mesures. Sans lui, il lit ce que le serveur
// a deja, ce qui suffit a un passage nocturne decouple.
//
// Le document decrit TOUT le code tel qu'il est, pas l'ecart avec le releve
// precedent : chaque probleme, ouvert ou ecarte, compte dans son axe
// (fiabilite, securite, maintenabilite) et dans sa famille (la regle Sonar),
// pour qu'un travail a faire laisse sciemment en commentaire se lise comme tel.
//
// Variables : SONAR_HOST_URL, SONAR_TOKEN, SONAR_PROJECT_KEY, QUALITE_REPORT,
// SONAR_ALERTES (facultative : export des alertes ouvertes pour la routine de
// correction nocturne).
//
// Code de sortie TOUJOURS 0 : c'est un releve, pas un verrou. Un probleme
// releve se lit dans le document, il ne fait pas rougir la CI d'un depot.

import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Le corps ne s execute qu en direct : sans ce garde, un simple import
// reclamerait un jeton et sortirait en erreur.
const estPrincipal = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

// --- Barriere de diffusion ---------------------------------------------------

// Le document part dans le Drive d'un client, ou tools/marqueurs.py refuse
// emoji, tirets typographiques et fleches, et annule alors la diffusion de TOUT
// le projet. Un nom de regle Sonar peut porter n'importe lequel des trois.
// Memes plages que marqueurs.py et check-licenses.mjs, volontairement : un
// tiret typographique devient un vrai tiret, le reste disparait.
const MARQUEURS = /[‐-―•←-⇿☀-➿⤀-⥿⬀-⯿️‍]|[\u{1f000}-\u{1faff}]/gu;
export const assainir = (texte) =>
  String(texte).replace(MARQUEURS, (c) => (/[‐-―]/.test(c) ? "-" : ""));

// --- Mise en forme des mesures -----------------------------------------------

// Le serveur est en mode MQR (sonar.multi-quality-mode.enabled, verifie le
// 2026-09-28) : ce sont ces mesures que son interface affiche. Les anciennes
// (bugs, code_smells, reliability_rating) divergeaient : simr notee A en
// fiabilite ici, C a l'ecran, pour trois expressions regulieres.
const METRIQUES = [
  "coverage",
  "duplicated_lines_density",
  "security_hotspots",
  "software_quality_maintainability_remediation_effort",
  "software_quality_reliability_rating",
  "software_quality_security_rating",
  "software_quality_maintainability_rating",
];

// Sonar rend les notes en nombre : 1 vaut A, 5 vaut E.
export const note = (v) => "ABCDE"[Math.round(Number(v)) - 1] ?? "?";

// L'effort de remediation est une duree en minutes. La convention Sonar compte
// la journee de travail a 8 heures : la restituer en minutes ne parle a personne.
export function dette(minutes) {
  const m = Math.round(Number(minutes));
  if (!Number.isFinite(m) || m <= 0) return "aucune";
  const jours = Math.floor(m / 480);
  const heures = Math.floor((m % 480) / 60);
  const reste = m % 60;
  const bouts = [];
  if (jours) bouts.push(`${jours} j`);
  if (heures) bouts.push(`${heures} h`);
  if (reste && !jours) bouts.push(`${reste} min`);
  return bouts.join(" ") || `${m} min`;
}

// --- Regroupement des problemes ----------------------------------------------

// Les trois axes, dans l'ordre du document, avec la mesure qui les note.
const AXES = [
  ["RELIABILITY", "Fiabilité", "software_quality_reliability_rating"],
  ["SECURITY", "Sécurité", "software_quality_security_rating"],
  ["MAINTAINABILITY", "Maintenabilité", "software_quality_maintainability_rating"],
];

const GRAVITES = ["INFO", "LOW", "MEDIUM", "HIGH", "BLOCKER"];
const GRAVITE_FR = {
  INFO: "info",
  LOW: "basse",
  MEDIUM: "moyenne",
  HIGH: "haute",
  BLOCKER: "bloquante",
};

// Une famille est une regle Sonar. Son numero (S1135) est le meme dans tous
// les langages : javascript:S4036 et typescript:S4036 font une seule famille.
// Relevees sur les dix projets le 2026-09-28, alertes ecartees comprises, et
// sur School Bus le 2026-10-05. Un
// numero absent d'ici garde le nom anglais que Sonar lui donne.
const FAMILLES = new Map([
  ["S1082", "Événements souris sans équivalent clavier"],
  ["S1135", "Commentaires TODO, travail laissé à faire"],
  ["S1313", "Adresses IP écrites en dur"],
  ["S1874", "API dépréciées encore utilisées"],
  ["S2871", "Tris de tableau sans fonction de comparaison"],
  ["S3358", "Conditions ternaires imbriquées"],
  ["S3735", "Opérateur void employé"],
  ["S3776", "Fonctions trop complexes à lire"],
  ["S4036", "Commandes système trouvées par le PATH"],
  ["S4084", "Médias sans sous-titres"],
  ["S4502", "Protection CSRF désactivée"],
  ["S4624", "Textes à gabarit imbriqués"],
  ["S4790", "Algorithmes de hachage faibles"],
  ["S5332", "Protocoles en clair (http, ftp)"],
  ["S5906", "Assertions de test trop génériques"],
  ["S5976", "Tests répétés au lieu d'être paramétrés"],
  ["S6479", "Index de tableau pris comme clé de liste React"],
  ["S6551", "Objets convertis en texte sans méthode toString"],
  ["S6564", "Alias de type redondants"],
  ["S6643", "Prototypes d'objets natifs modifiés"],
  ["S6653", "hasOwnProperty au lieu d'Object.hasOwn"],
  ["S6747", "Attributs JSX inconnus"],
  ["S6759", "Propriétés React modifiables"],
  ["S6819", "Rôle ARIA à la place de la balise native"],
  ["S6847", "Gestionnaires d'événements sur des éléments non interactifs"],
  ["S6848", "Éléments non interactifs rendus cliquables"],
  ["S7503", "Fonctions async sans rien d'asynchrone"],
  ["S7504", "Appels à list() superflus dans une itération"],
  ["S7758", "Méthodes de chaîne qui ignorent l'Unicode"],
  ["S7767", "Opérateurs bit à bit pour tronquer un nombre"],
  ["S7776", "Tableaux qui ne servent qu'à tester une présence"],
  ["S7780", "Barres obliques inverses doublées au lieu de String.raw"],
  ["S8786", "Expressions régulières à retour arrière non linéaire"],
  ["S8980", "Appels de Testing Library enveloppés dans act()"],
  ["S9332", "Tests Playwright qui attendent le silence réseau"],
]);

// Ce que veut dire chaque regle, pour un lecteur qui n'est pas developpeur.
// Pas de chevron ni de barre verticale : la cellule est du Markdown de tableau.
const SENS = new Map([
  ["S1082", "une action déclenchée à la souris, au survol ou au clic, n'a pas d'équivalent au clavier : elle reste hors de portée sans souris."],
  ["S1135", "le développeur a noté un travail remis à plus tard ; sans suivi, il s'oublie."],
  ["S1313", "une adresse IP figure en clair dans le code : la changer impose de redéployer, et elle renseigne sur l'infrastructure."],
  ["S1874", "le code appelle une fonction que sa bibliothèque annonce comme vouée à disparaître ; elle cessera de marcher lors d'une prochaine mise à jour."],
  ["S2871", "sans fonction de comparaison, JavaScript trie les valeurs comme du texte : 10 passe avant 9."],
  ["S3358", "une condition écrite en une ligne (a ? b : c) imbriquée dans une autre se lit mal et cache facilement une erreur de logique."],
  ["S3735", "l'opérateur void jette le résultat d'une expression, souvent une tâche lancée sans attendre sa fin : l'intention se lit mal, et une erreur de cette tâche peut passer inaperçue."],
  ["S3776", "la fonction enchaîne trop de conditions et de boucles pour se comprendre d'une traite ; elle est plus difficile à tester et à modifier sans erreur."],
  ["S4036", "le code lance un programme par son seul nom, sans chemin complet ; sur une machine mal configurée, un autre programme du même nom pourrait être lancé à sa place."],
  ["S4084", "une vidéo ou un son est diffusé sans sous-titres, ce qui l'exclut pour les personnes sourdes ou malentendantes."],
  ["S4502", "la protection contre les requêtes forgées depuis un autre site est coupée : un site tiers pourrait faire agir un utilisateur connecté à son insu."],
  ["S4624", "un texte assemblé à partir de variables en contient un autre assemblé de même : la ligne devient difficile à lire."],
  ["S4790", "le code emploie un algorithme de hachage cassé (MD5, SHA-1) : sans risque pour une empreinte technique, dangereux pour un mot de passe ou une signature."],
  ["S5332", "une adresse en http ou ftp fait circuler les données sans chiffrement, lisibles et modifiables en chemin."],
  ["S5906", "un test vérifie un résultat par une comparaison générique là où une vérification dédiée existe et expliquerait mieux un échec."],
  ["S5976", "plusieurs tests ne diffèrent que par leurs valeurs ; les réunir en un test sur un tableau de cas éviterait de dupliquer le code."],
  ["S6479", "une liste à l'écran identifie ses éléments par leur position : si elle est triée ou filtrée, l'affichage peut les mélanger."],
  ["S6551", "un objet est converti en texte sans savoir le faire, et s'affiche « [object Object] » au lieu de sa valeur."],
  ["S6564", "un type est déclaré comme simple autre nom d'un type existant : il alourdit le code sans l'éclairer."],
  ["S6643", "le code modifie un objet de base du langage, ce qui peut casser une bibliothèque qui compte sur son comportement normal."],
  ["S6653", "la vérification hasOwnProperty échoue sur certains objets ; Object.hasOwn, plus récente, est toujours sûre."],
  ["S6747", "un élément reçoit un attribut que le navigateur ne connaît pas et ignore, souvent une faute de frappe."],
  ["S6759", "les données reçues par un composant d'écran ne sont pas déclarées en lecture seule, ce qui laisse le code les modifier par erreur."],
  ["S6819", "un élément générique imite un bouton ou un lien par un attribut role, là où la balise native apporte d'office clavier et lecteur d'écran."],
  ["S6847", "un élément qui n'est pas interactif réagit à la souris ou au clavier, sans que les technologies d'assistance le présentent comme actionnable."],
  ["S6848", "un élément non interactif est rendu cliquable sans rôle ni accès au clavier : inutilisable sans souris."],
  ["S7503", "une fonction est déclarée asynchrone alors qu'elle n'attend rien : c'est trompeur pour qui l'appelle."],
  ["S7504", "en Python, list() autour d'une valeur déjà parcourable crée une copie inutile avant la boucle."],
  ["S7758", "le texte est lu caractère par caractère d'une façon qui casse les emoji et certains caractères composés."],
  ["S7767", "une astuce de calcul binaire sert à tronquer un nombre et donne un résultat faux au-delà de deux milliards ; Math.trunc fait la même chose sans limite."],
  ["S7776", "un tableau sert seulement à tester si une valeur est présente ; un ensemble (Set) le fait bien plus vite sur une longue liste."],
  ["S7780", "un texte double chaque barre oblique inverse pour l'échapper, là où String.raw l'écrirait telle quelle, plus lisiblement."],
  ["S8786", "une expression régulière peut mettre un temps démesuré sur certains textes : un texte piégé pourrait bloquer le serveur."],
  ["S8980", "un appel de Testing Library est enveloppé dans act() alors qu'il le fait déjà : c'est inutile et peut masquer des avertissements."],
  ["S9332", "un test de navigateur attend que le réseau se taise, une attente lente et instable ; attendre un élément précis de la page est plus fiable."],
]);

// Nom de la famille, suivi de ce qu'elle veut dire quand on le sait.
export const signification = (f) => {
  const sens = SENS.get(f.numero);
  return sens ? `${f.nom}. ${sens[0].toUpperCase()}${sens.slice(1)}` : f.nom;
};

const OUVERTES = new Set(["OPEN", "CONFIRMED"]);
const COLONNE = { ACCEPTED: "acceptes", FALSE_POSITIVE: "fauxPositifs" };

function compter(familles, numero, nom, colonne, severite) {
  const f = familles.get(numero) ?? { numero, nom, gravite: "INFO", aTraiter: 0, acceptes: 0, fauxPositifs: 0 };
  familles.set(numero, f);
  f[colonne] += 1;
  if (GRAVITES.indexOf(severite) > GRAVITES.indexOf(f.gravite)) f.gravite = severite;
}

// Axe -> familles triees, la gravite la plus haute d'abord, puis les plus
// nombreuses a traiter. Un probleme
// compte dans chaque axe qu'il touche, comme Sonar le compte : S7767 est a la
// fois de fiabilite et de maintenabilite.
export function regrouper(alertes, regles = new Map()) {
  const axes = new Map(AXES.map(([q]) => [q, new Map()]));
  for (const a of alertes) {
    const numero = a.rule.slice(a.rule.indexOf(":") + 1);
    const nom = FAMILLES.get(numero) ?? regles.get(a.rule) ?? numero;
    const colonne = OUVERTES.has(a.issueStatus) ? "aTraiter" : COLONNE[a.issueStatus];
    if (!colonne) continue;
    for (const { softwareQuality, severity } of a.impacts ?? []) {
      const familles = axes.get(softwareQuality);
      if (familles) compter(familles, numero, nom, colonne, severity);
    }
  }
  const total = (f) => f.aTraiter + f.acceptes + f.fauxPositifs;
  return new Map(
    [...axes].map(([q, familles]) => [
      q,
      [...familles.values()].sort(
        (x, y) =>
          GRAVITES.indexOf(y.gravite) - GRAVITES.indexOf(x.gravite) ||
          y.aTraiter - x.aTraiter || total(y) - total(x) || x.numero.localeCompare(y.numero),
      ),
    ]),
  );
}

// --- Acces au serveur --------------------------------------------------------

const hote = (process.env.SONAR_HOST_URL ?? "").replace(/(?<!\/)\/+$/, "");
const jeton = process.env.SONAR_TOKEN ?? "";

async function api(chemin) {
  const r = await fetch(`${hote}${chemin}`, {
    headers: { Authorization: `Bearer ${jeton}`, Accept: "application/json" },
  });
  if (!r.ok) throw new Error(`${chemin} : HTTP ${r.status}`);
  return r.json();
}

// Le scanner depose l'identifiant de sa tache ; sans cette attente, on lirait
// les mesures du scan precedent en croyant lire celles de celui-ci.
async function attendre(rapport) {
  const txt = readFileSync(rapport, "utf8");
  const id = /^ceTaskId=(.+)$/m.exec(txt)?.[1]?.trim();
  if (!id) return;
  for (let i = 0; i < 60; i++) {
    const { task } = await api(`/api/ce/task?id=${encodeURIComponent(id)}`);
    if (task?.status === "SUCCESS") return;
    if (task?.status === "FAILED" || task?.status === "CANCELED") {
      throw new Error(`tache ${id} : ${task.status}`);
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error(`tache ${id} : toujours en cours apres 5 minutes`);
}

// Tous les problemes du projet, ouverts comme ecartes, et le nom anglais de
// leurs regles. Sonar plafonne la recherche a 10 000 resultats : 20 pages de 500.
async function lireAlertes(cle) {
  const alertes = [];
  const regles = new Map();
  for (let page = 1; page <= 20; page += 1) {
    const r = await api(
      `/api/issues/search?componentKeys=${encodeURIComponent(cle)}` +
        `&issueStatuses=OPEN,CONFIRMED,ACCEPTED,FALSE_POSITIVE&additionalFields=rules&ps=500&p=${page}`,
    );
    alertes.push(...(r.issues ?? []));
    for (const regle of r.rules ?? []) regles.set(regle.key, regle.name);
    if (page * 500 >= (r.total ?? 0)) break;
  }
  return { alertes, regles };
}

// Liste des alertes ouvertes, relue chaque matin par la routine de correction nocturne.
// Fichier interne (SONAR_ALERTES), jamais dans docs/drive qui part chez le client. Un refus
// du jeton ne fait pas tomber le releve : le fichier porte alors l'erreur.
function exporterAlertes(cle, fichier, alertes, erreur) {
  const ouvertes = (alertes ?? []).filter((i) => OUVERTES.has(i.issueStatus));
  const sortie = {
    projet: cle,
    exporte: new Date().toISOString(),
    total: ouvertes.length,
    alertes: ouvertes.map((i) => ({
      regle: i.rule,
      type: i.type,
      gravite: i.severity,
      fichier: i.component.slice(i.component.indexOf(":") + 1),
      ligne: i.line ?? null,
      message: i.message,
      creee: i.creationDate,
    })),
  };
  if (erreur) sortie.erreur = erreur;
  const chemin = resolve(process.cwd(), fichier);
  mkdirSync(dirname(chemin), { recursive: true });
  writeFileSync(chemin, `${JSON.stringify(sortie, null, 2)}\n`);
  console.log(`Alertes ouvertes : ${sortie.erreur ?? sortie.total} -> ${chemin}`);
}

// --- Selftest ----------------------------------------------------------------

if (estPrincipal && process.argv[2] === "--selftest") {
  const alerte = (rule, issueStatus, ...impacts) => ({
    rule,
    issueStatus,
    impacts: impacts.map(([softwareQuality, severity]) => ({ softwareQuality, severity })),
  });
  const g = regrouper(
    [
      alerte("typescript:S1135", "OPEN", ["MAINTAINABILITY", "INFO"]),
      alerte("typescript:S1135", "ACCEPTED", ["MAINTAINABILITY", "INFO"]),
      alerte("javascript:S4036", "FALSE_POSITIVE", ["SECURITY", "LOW"]),
      alerte("typescript:S4036", "CONFIRMED", ["SECURITY", "LOW"]),
      alerte("typescript:S7767", "OPEN", ["MAINTAINABILITY", "HIGH"], ["RELIABILITY", "HIGH"]),
      alerte("typescript:S9999", "OPEN", ["RELIABILITY", "MEDIUM"]),
      alerte("typescript:S9998", "OPEN", ["RELIABILITY", "LOW"]),
      alerte("typescript:S9998", "CLOSED", ["RELIABILITY", "BLOCKER"]),
    ],
    new Map([["typescript:S9999", "Some english rule name"]]),
  );
  // La gravite passe devant le nombre : S7767 (haute) avant S1135 (info).
  const [s7767, todo] = g.get("MAINTAINABILITY");
  const cas = [
    [() => note(1), "A"],
    [() => note(5), "E"],
    [() => note("3.0"), "C"],
    [() => dette(0), "aucune"],
    [() => dette(45), "45 min"],
    [() => dette(480), "1 j"],
    [() => dette(540), "1 j 1 h"],
    [() => dette(120), "2 h"],
    [() => assainir("un — deux → trois"), "un - deux  trois"],
    // Une famille par regle, ouverts et ecartes chacun dans sa colonne.
    [() => `${todo.numero} ${todo.aTraiter}/${todo.acceptes}/${todo.fauxPositifs}`, "S1135 1/1/0"],
    [() => todo.nom, "Commentaires TODO, travail laissé à faire"],
    [() => signification(todo).startsWith("Commentaires TODO, travail laissé à faire. Le développeur"), true],
    // Chaque famille connue a son sens, et aucun ne casse la cellule du tableau.
    [() => [...FAMILLES.keys()].filter((n) => !SENS.has(n)).join(","), ""],
    [() => [...SENS.values()].some((s) => /[|<>]/.test(s) || assainir(s) !== s), false],
    // Meme numero en javascript et en typescript : une seule famille.
    [() => g.get("SECURITY").length, 1],
    [() => `${g.get("SECURITY")[0].aTraiter}/${g.get("SECURITY")[0].fauxPositifs}`, "1/1"],
    // Un probleme a deux impacts compte dans les deux axes.
    [() => `${s7767.numero} ${s7767.gravite}`, "S7767 HIGH"],
    [() => g.get("RELIABILITY").map((f) => f.numero).join(","), "S7767,S9999,S9998"],
    // Nom anglais de Sonar, faute de traduction ; un statut ferme ne compte pas.
    [() => g.get("RELIABILITY")[1].nom, "Some english rule name"],
    [() => signification(g.get("RELIABILITY")[1]), "Some english rule name"],
    [() => `${g.get("RELIABILITY")[2].nom} ${g.get("RELIABILITY")[2].gravite}`, "S9998 LOW"],
  ];
  for (const [f, attendu] of cas) {
    const got = f();
    if (got !== attendu) {
      console.error(`FAIL : attendu ${JSON.stringify(attendu)}, obtenu ${JSON.stringify(got)}`);
      process.exit(1);
    }
  }
  console.log(`selftest OK (${cas.length} cas, barriere de diffusion comprise)`);
  process.exit(0);
}

// --- Relevé ------------------------------------------------------------------

if (estPrincipal) {
  const cle = process.env.SONAR_PROJECT_KEY ?? "";
  if (!hote || !jeton || !cle) {
    console.error("SONAR_HOST_URL, SONAR_TOKEN et SONAR_PROJECT_KEY sont requis.");
    process.exit(2);
  }

  if (process.argv[2]) await attendre(process.argv[2]);

  const composant = await api(
    `/api/measures/component?component=${encodeURIComponent(cle)}&metricKeys=${METRIQUES.join(",")}`,
  );
  const v = Object.fromEntries(
    (composant?.component?.measures ?? []).map((m) => [m.metric, m.value ?? m.period?.value ?? ""]),
  );

  // Le detail manque si le jeton est refuse sur la recherche : les mesures
  // restent publiees, le document dit ce qui manque au lieu de se taire.
  let alertes = null;
  let regles = new Map();
  let erreur = "";
  try {
    ({ alertes, regles } = await lireAlertes(cle));
  } catch (e) {
    erreur = e.message;
  }
  const axes = alertes ? regrouper(alertes, regles) : null;

  const today = new Date().toISOString().slice(0, 10);
  const nb = (x) => (x === "" || x === undefined ? "non mesuré" : String(x));
  const pourcent = (x) => (x === "" || x === undefined ? "non mesurée" : `${x} %`);
  const somme = (familles, colonne) => familles.reduce((s, f) => s + f[colonne], 0);

  const vueAxe = ([q, libelle, mesure]) => {
    const familles = axes?.get(q) ?? [];
    const compte = (colonne) => (axes ? somme(familles, colonne) : "non lu");
    return `| ${libelle} | ${note(v[mesure])} | ${compte("aTraiter")} | ${compte("acceptes")} | ${compte("fauxPositifs")} |`;
  };

  const tableauAxe = (familles) => {
    if (!axes) return [`Le détail n'a pas pu être lu lors de ce relevé (${erreur}).`];
    if (familles.length === 0) return ["Aucun problème relevé, ni à traiter ni écarté."];
    return [
      `| Règle | Ce que signifie l'erreur | Gravité | Occurrences | À traiter | Acceptés | Faux positifs |`,
      `| --- | --- | --- | --- | --- | --- | --- |`,
      ...familles.map(
        (f) =>
          `| ${f.numero} | ${signification(f)} | ${GRAVITE_FR[f.gravite] ?? f.gravite} | ${f.aTraiter + f.acceptes + f.fauxPositifs} | ${f.aTraiter} | ${f.acceptes} | ${f.fauxPositifs} |`,
      ),
    ];
  };

  const sectionAxe = ([q, libelle, mesure]) => {
    const corps = tableauAxe(axes?.get(q) ?? []);
    const hotspots =
      q === "SECURITY"
        ? [
            ``,
            `Points de sécurité à examiner : ${nb(v.security_hotspots)}.`,
            ``,
            `Ce ne sont pas des failles, mais des endroits où le code touche à un sujet`,
            `sensible et mérite un regard : chacun demande une décision, pas une`,
            `correction automatique.`,
          ]
        : [];
    return [`## ${libelle}`, ``, `Note : ${note(v[mesure])}.`, ``, ...corps, ...hotspots, ``];
  };

  const md = [
    `# Qualité du code`,
    ``,
    // Ce qui precede le premier `##` fait la page de garde : la date seule,
    // decision du 2026-09-28.
    `Date du relevé : ${today}`,
    ``,
    `## Vue d'ensemble`,
    ``,
    `| Axe | Note | À traiter | Acceptés | Faux positifs |`,
    `| --- | --- | --- | --- | --- |`,
    ...AXES.map(vueAxe),
    ``,
    `À traiter : problèmes ouverts, y compris ceux qu'on garde sciemment ouverts,`,
    `comme un TODO qui attend une décision. Acceptés : examinés, reconnus et laissés`,
    `en l'état volontairement, comme une API dépréciée qui n'a pas encore de`,
    `remplaçant. Faux positifs : examinés, l'outil s'est trompé. Seuls les problèmes`,
    `à traiter pèsent sur les notes.`,
    ``,
    `Les notes vont de A à E. En fiabilité et en sécurité, elles suivent la gravité`,
    `du problème à traiter le plus sérieux : A aucun, B gravité basse, C moyenne,`,
    `D haute, E bloquante. En maintenabilité, elle suit le rapport entre la dette`,
    `technique et l'effort qu'a demandé le code.`,
    ``,
    `| Mesure | Valeur |`,
    `| --- | --- |`,
    `| Points de sécurité à examiner | ${nb(v.security_hotspots)} |`,
    `| Couverture par les tests | ${pourcent(v.coverage)} |`,
    `| Lignes dupliquées | ${pourcent(v.duplicated_lines_density)} |`,
    `| Dette technique | ${dette(v.software_quality_maintainability_remediation_effort)} |`,
    ``,
    `Les trois sections qui suivent détaillent chaque axe erreur par erreur : une`,
    `ligne réunit les problèmes d'une même règle de l'outil, dont la colonne Règle`,
    `donne l'identifiant dans SonarQube. Occurrences compte tous ses problèmes, puis`,
    `les trois colonnes suivantes les répartissent. Un problème qui touche deux axes`,
    `compte dans chacun.`,
    ``,
    ...AXES.flatMap(sectionAxe),
    `## Ce que ce document ne dit pas`,
    ``,
    `L'analyse statique lit le code, elle ne l'exécute pas. Elle ne remplace ni`,
    `les tests, ni une revue humaine, ni un audit de sécurité applicatif : elle`,
    `signale ce qui se voit à la lecture, à la vitesse d'une machine.`,
    ``,
  ];

  const chemin = resolve(process.cwd(), process.env.QUALITE_REPORT ?? "docs/qualite-du-code.md");
  mkdirSync(dirname(chemin), { recursive: true });
  writeFileSync(chemin, assainir(md.join("\n")));

  console.log(`Rapport : ${chemin}`);
  console.log(
    AXES.map(([q, libelle]) => `${libelle} ${axes ? somme(axes.get(q), "aTraiter") : "non lu"}`).join(", ") +
      `, couverture ${nb(v.coverage)} %, dette ${dette(v.software_quality_maintainability_remediation_effort)}`,
  );
  if (process.env.SONAR_ALERTES) exporterAlertes(cle, process.env.SONAR_ALERTES, alertes, erreur);
}
