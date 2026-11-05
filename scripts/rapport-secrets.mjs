#!/usr/bin/env node
// Rend le JSON de gitleaks en document Drive.
//
//   GITLEAKS_COMMITS=217 SECRETS_REPORT=docs/drive/bm-14-detection-secrets.md \
//     node scripts/rapport-secrets.mjs /tmp/gitleaks.json
//
// GITLEAKS_COMMITS est le nombre de commits que gitleaks dit avoir parcourus,
// relevé dans son journal par le workflow. Pas git rev-list : gitleaks saute
// les fusions et les commits sans modification, et le document dit ce qui a
// été lu, pas ce qui existe.
//
// Le document part chez le client. Il n'y écrit jamais la valeur d'un secret
// (gitleaks la masque déjà avec --redact, mais le champ Match n'est pas repris
// pour autant), ni l'auteur, ni son adresse, ni le message du commit : ce sont
// des données personnelles, et elles n'aident pas à révoquer quoi que ce soit.
//
// Pas de tiret long, pas de puce, pas de flèche, pas d'emoji :
// tools/marqueurs.py du dépôt bullify-documentation refuse la publication sinon.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname } from "node:path";

const entree = process.argv[2];
const sortie = process.env.SECRETS_REPORT;
const commits = Number(process.env.GITLEAKS_COMMITS);
if (!entree || !sortie || !(commits > 0)) {
  console.error(
    "usage : GITLEAKS_COMMITS=<n> SECRETS_REPORT=<chemin.md> node scripts/rapport-secrets.mjs <gitleaks.json>",
  );
  process.exit(2);
}

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();

// Un clone superficiel ne porte que le dernier commit : zéro constat s'y lit
// comme un historique propre alors qu'il n'a pas été lu. Même piège que le
// Semgrep qui n'analyse aucun fichier, même réponse : échouer bruyamment.
if (git("rev-parse", "--is-shallow-repository") === "true") {
  console.error("Clone superficiel : l'historique n'a pas été parcouru. fetch-depth: 0 manque.");
  process.exit(1);
}

const constats = JSON.parse(readFileSync(entree, "utf8")).map((c) => ({
  regle: c.RuleID,
  fichier: c.File,
  ligne: c.StartLine,
  commit: String(c.Commit ?? "").slice(0, 8),
  date: String(c.Date ?? "").slice(0, 10),
}));

// Chaque ligne non commentée de .gitleaksignore est un constat examiné et
// écarté. Le compte dit au lecteur que le zéro du verdict n'est pas un oubli.
const ecartes = existsSync(".gitleaksignore")
  ? readFileSync(".gitleaksignore", "utf8")
      .split("\n")
      .filter((x) => x.trim() && !x.trim().startsWith("#")).length
  : 0;

const aujourdhui = new Date().toISOString().slice(0, 10);

const l = [];
l.push("# Détection de secrets");
l.push("");
l.push("Ce document recense les secrets que la détection trouve dans le code source");
l.push("du projet et dans tout son historique de versions : clés d'API, jetons");
l.push("d'accès, mots de passe, clés privées. Il est régénéré la nuit qui suit");
l.push("chaque modification du code, sans intervention humaine.");
l.push("");
l.push("Un secret retiré du code reste lisible dans l'historique, et quiconque a eu");
l.push("accès au dépôt a pu le copier. Le retirer ne suffit donc pas : seule sa");
l.push("révocation auprès du service qui l'a émis le neutralise.");
l.push("");
l.push("L'outil est gitleaks, dans sa version libre. Il lit le dépôt sans l'exécuter");
l.push("et sans le transmettre à un tiers. Aucune valeur de secret ne figure dans ce");
l.push("document.");
l.push("");
l.push(`Date du relevé : ${aujourdhui}`);
l.push("");
l.push(`Versions parcourues : ${commits}, de la première à la dernière`);
l.push("");
l.push(
  existsSync(".gitleaks.toml")
    ? "Règles appliquées : jeu par défaut de gitleaks, complété par la configuration du dépôt"
    : "Règles appliquées : jeu par défaut de gitleaks",
);
l.push("");
l.push(`Constats examinés et écartés : ${ecartes}`);
l.push("");
l.push("## Verdict");
l.push("");
if (constats.length === 0) {
  l.push("Aucun secret à traiter.");
  if (ecartes) {
    l.push("");
    l.push("Les constats écartés sont des valeurs de test, des exemples de");
    l.push("documentation ou des secrets déjà révoqués. Chacun est justifié dans le");
    l.push("fichier .gitleaksignore du dépôt, qui le désigne par sa version et son");
    l.push("emplacement exacts : la même valeur réapparue ailleurs serait relevée à");
    l.push("nouveau.");
  }
} else {
  l.push(`${constats.length} secret(s) à traiter. Pour chacun : le révoquer auprès du`);
  l.push("service qui l'a émis, le remplacer, puis l'inscrire comme écarté avec la");
  l.push("date de sa révocation. Tant que ce n'est pas fait, le contrôle de nuit");
  l.push("échoue.");
  l.push("");
  l.push("## Secrets à traiter");
  l.push("");
  l.push("| Type | Fichier | Ligne | Version | Date |");
  l.push("| --- | --- | --- | --- | --- |");
  // Du plus ancien au plus récent : le plus ancien a été exposé le plus longtemps.
  for (const c of constats.sort(
    (x, y) => x.date.localeCompare(y.date) || x.fichier.localeCompare(y.fichier),
  )) {
    l.push(`| \`${c.regle}\` | \`${c.fichier}\` | ${c.ligne} | \`${c.commit}\` | ${c.date} |`);
  }
}
l.push("");
l.push("## Portée et limites");
l.push("");
l.push("La détection reconnaît un secret à sa forme : un préfixe connu, une");
l.push("longueur, une chaîne assez aléatoire. Un mot de passe choisi par une");
l.push("personne, sans forme particulière, peut lui échapper. À l'inverse, une");
l.push("chaîne aléatoire qui n'est pas un secret peut la déclencher, d'où l'examen");
l.push("de chaque constat avant de l'écarter.");
l.push("");
l.push("Le contrôle porte sur le dépôt de code et son historique. Ce qui n'y a");
l.push("jamais été écrit, variables de l'hébergement ou coffre de secrets, est hors");
l.push("de sa portée.");
l.push("");

mkdirSync(dirname(sortie), { recursive: true });
writeFileSync(sortie, l.join("\n"));
console.log(
  `${sortie} : ${constats.length} secret(s) à traiter sur ${commits} versions, ${ecartes} écarté(s).`,
);
