#!/usr/bin/env node
// Chaque dictionnaire a exactement les clés de fr.json (socle §i18n, détection de drift) :
// une clé absente d'une langue s'afficherait brute à l'écran, sans erreur.
import { readdirSync, readFileSync } from "node:fs";

const dossier = new URL("../packages/i18n/src/messages/", import.meta.url);
const cles = (objet, prefixe = "") =>
  Object.entries(objet).flatMap(([k, v]) =>
    v && typeof v === "object" ? cles(v, `${prefixe}${k}.`) : [`${prefixe}${k}`],
  );
const lire = (f) => new Set(cles(JSON.parse(readFileSync(new URL(f, dossier), "utf8"))));

const reference = lire("fr.json");
let ecarts = 0;
for (const f of readdirSync(dossier).filter((f) => f.endsWith(".json") && f !== "fr.json")) {
  const langue = lire(f);
  for (const k of reference) if (!langue.has(k)) (console.error(`${f} : manque ${k}`), ecarts++);
  for (const k of langue) if (!reference.has(k)) (console.error(`${f} : en trop ${k}`), ecarts++);
}
if (ecarts) process.exit(1);
console.log("i18n : dictionnaires alignés sur fr.json");
