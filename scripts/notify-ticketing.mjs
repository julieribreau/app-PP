#!/usr/bin/env node
// Envoie le rapport de securite des dependances a Bullify Ticketing, qui en
// fait des tickets traites par son worker (montee de dependance ou exception
// datee), puis fusionne les PR vertes. Meme script dans chaque depot Bullify.
//
// Usage (job `ticketing` de dependances-securite.yml, sur main seulement) :
//   node scripts/notify-ticketing.mjs rapport-osv.json rapport-audit.json
//
// Le rapport est complet : ce qu'il ne contient plus est resolu cote Ticketing.
// Il ne part donc que si les deux controles ont rendu le leur ; un controle qui
// a plante n'envoie rien.
//
// Variables : SECURITE_WEBHOOK_SECRET (secret du depot, meme valeur que celle de
// Ticketing), et celles que GitHub Actions fournit (GITHUB_REPOSITORY,
// GITHUB_SHA, GITHUB_SERVER_URL, GITHUB_RUN_ID). TICKETING_URL pour une autre
// instance.

import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";

const url = process.env.TICKETING_URL ?? "https://support.bullify.io/api/webhooks/securite";
const secret = process.env.SECURITE_WEBHOOK_SECRET;
if (!secret) throw new Error("SECURITE_WEBHOOK_SECRET absent");
const { GITHUB_REPOSITORY, GITHUB_SHA, GITHUB_SERVER_URL, GITHUB_RUN_ID } = process.env;
if (!GITHUB_REPOSITORY || !GITHUB_SHA) throw new Error("hors de GitHub Actions : GITHUB_REPOSITORY et GITHUB_SHA requis");

const fichiers = process.argv.slice(2);
if (!fichiers.length) throw new Error("aucun rapport a envoyer");
const findings = fichiers.flatMap((f) => JSON.parse(readFileSync(f, "utf8")).findings);

const corps = JSON.stringify({
  version: 1,
  repository: GITHUB_REPOSITORY,
  commit: GITHUB_SHA,
  runUrl: `${GITHUB_SERVER_URL ?? "https://github.com"}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`,
  findings,
});
const signature = "sha256=" + createHmac("sha256", secret).update(corps).digest("hex");

// Trois essais : un redemarrage de Ticketing ne doit pas perdre le rapport du
// jour. Un 4xx ne se reessaie pas, il ne changera pas.
for (let essai = 1; ; essai++) {
  let statut = 0;
  let texte = "";
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-bullify-signature-256": signature },
      body: corps,
    });
    statut = r.status;
    texte = await r.text();
  } catch (err) {
    texte = err.message;
  }
  console.log(`Ticketing, essai ${essai} : HTTP ${statut || "-"} ${texte.slice(0, 500)}`);
  if (statut >= 200 && statut < 300) break;
  if ((statut >= 400 && statut < 500) || essai === 3) {
    console.log(`::error::rapport de securite non transmis a Ticketing (HTTP ${statut || "-"})`);
    process.exit(1);
  }
  await new Promise((ok) => setTimeout(ok, 20_000 * essai));
}
console.log(`${findings.length} constat(s) transmis a Ticketing.`);
