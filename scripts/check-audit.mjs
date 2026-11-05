#!/usr/bin/env node
// Audit du registre (npm audit ou pnpm audit), avec les exceptions de
// osv-scanner.toml. Meme script dans chaque depot Bullify, au formatage pres.
//
// Usage :
//   node scripts/check-audit.mjs                    la racine du depot
//   node scripts/check-audit.mjs . mobile           plusieurs dossiers
//   node scripts/check-audit.mjs --rapport /tmp/audit.json .
//
// Le gestionnaire se deduit du lockfile du dossier (pnpm-lock.yaml, sinon npm).
// Les exceptions sont celles de scripts/check-osv.mjs, qui veille a ce qu'elles
// ne tiennent que tant qu'aucun correctif n'est publie : une exception active
// (sans `ignoreUntil`, ou avant cette date) ecarte l'avis par son identifiant
// GHSA ou CVE. Tout ce qui reste fait echouer, quelle que soit la gravite.
// Un audit illisible fait echouer aussi : un silence n'est pas un vert.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const iRapport = args.indexOf("--rapport");
const rapport = iRapport >= 0 ? args.splice(iRapport, 2)[1] : null;
const dossiers = args.length ? args : ["."];

// --- Exceptions ---------------------------------------------------------------

function exceptionsActives() {
  if (!existsSync("osv-scanner.toml")) return new Set();
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const actives = new Set();
  for (const bloc of readFileSync("osv-scanner.toml", "utf8").split("[[IgnoredVulns]]").slice(1)) {
    const id = bloc.match(/^\s*id\s*=\s*"([^"]+)"/m)?.[1];
    const jusqua = bloc.match(/^\s*ignoreUntil\s*=\s*(\d{4}-\d{2}-\d{2})/m)?.[1];
    if (id && (!jusqua || jusqua >= aujourdhui)) actives.add(id);
  }
  return actives;
}

// --- Audit --------------------------------------------------------------------

function auditer(dossier) {
  const pnpm = existsSync(join(dossier, "pnpm-lock.yaml"));
  const r = spawnSync(pnpm ? "pnpm" : "npm", ["audit", "--json"], {
    cwd: dossier,
    encoding: "utf8",
    maxBuffer: 1 << 28,
  });
  if (r.error) throw r.error;
  let d;
  try {
    d = JSON.parse(r.stdout);
  } catch {
    throw new Error(`audit illisible dans ${dossier} (sortie ${r.status})\n${r.stderr}`);
  }
  if (d.error) throw new Error(`audit en erreur dans ${dossier} : ${JSON.stringify(d.error)}`);

  if (pnpm) {
    return Object.values(d.advisories ?? {}).map((a) => ({
      id: a.github_advisory_id ?? String(a.id),
      alias: a.cves ?? [],
      paquet: a.module_name,
      versions: [...new Set((a.findings ?? []).map((f) => f.version))],
      gravite: a.severity,
      titre: a.title ?? null,
      dossier,
    }));
  }
  // npm audit ne donne pas la version installee : le lockfile, si.
  const lock = existsSync(join(dossier, "package-lock.json"))
    ? JSON.parse(readFileSync(join(dossier, "package-lock.json"), "utf8")).packages ?? {}
    : {};
  const versionsDe = (nom) =>
    [...new Set(Object.entries(lock).filter(([k]) => k.endsWith(`node_modules/${nom}`)).map(([, v]) => v.version))];
  const avis = new Map();
  for (const v of Object.values(d.vulnerabilities ?? {})) {
    for (const via of v.via ?? []) {
      if (typeof via !== "object" || !via.url) continue;
      const id = via.url.split("/").pop();
      const cle = `${id}|${via.name}`;
      if (!avis.has(cle)) {
        avis.set(cle, {
          id,
          alias: [],
          paquet: via.name,
          versions: versionsDe(via.name),
          gravite: via.severity,
          titre: via.title ?? null,
          dossier,
        });
      }
    }
  }
  return [...avis.values()];
}

// Un correctif est-il publie ? Meme regle que scripts/check-osv.mjs : la derniere
// version du registre, soumise a l'avis tel qu'OSV l'applique. Le `fixAvailable`
// de npm propose parfois un retour arriere d'un parent : il ne dit pas ca.
async function correctif(a) {
  try {
    const r = await fetch(`https://registry.npmjs.org/${a.paquet.replace("/", "%2f")}`, {
      headers: { accept: "application/vnd.npm.install-v1+json" },
    });
    if (!r.ok) return null;
    const derniere = (await r.json())["dist-tags"].latest;
    const q = await fetch("https://api.osv.dev/v1/query", {
      method: "POST",
      body: JSON.stringify({ package: { name: a.paquet, ecosystem: "npm" }, version: derniere }),
    });
    if (!q.ok) return null;
    const { vulns = [] } = await q.json();
    const touchee = vulns.some((x) => [x.id, ...(x.aliases ?? [])].some((id) => [a.id, ...a.alias].includes(id)));
    return { published: !touchee, latestVersion: derniere };
  } catch {
    return null;
  }
}

const actives = exceptionsActives();
const tous = dossiers.flatMap(auditer);
const retenus = tous.filter((a) => ![a.id, ...a.alias].some((x) => actives.has(x)));
const ecartes = tous.length - retenus.length;

const ordre = { critical: 0, high: 1, moderate: 2, low: 3, info: 4 };
retenus.sort((a, b) => (ordre[a.gravite] ?? 5) - (ordre[b.gravite] ?? 5));
for (const a of retenus) {
  console.log(`${a.gravite.padEnd(8)}  ${a.paquet}${a.versions.length ? "@" + a.versions.join(",") : ""}  ${a.id}  (${a.dossier})`);
}
if (ecartes) console.log(`${ecartes} avis ecarte(s) par les exceptions de osv-scanner.toml.`);
console.log(`${retenus.length} vulnerabilite(s).`);

if (rapport) {
  const fixes = await Promise.all(retenus.map(correctif));
  const findings = retenus.map((a, i) => ({
    kind: "vulnerability",
    advisoryId: a.id,
    aliases: a.alias,
    package: { ecosystem: "npm", name: a.paquet, version: a.versions.join(",") },
    file: join(a.dossier, existsSync(join(a.dossier, "pnpm-lock.yaml")) ? "pnpm-lock.yaml" : "package-lock.json"),
    score: null,
    tool: "audit",
    title: a.titre,
    fix: fixes[i],
  }));
  writeFileSync(rapport, JSON.stringify({ findings }, null, 2));
}
if (retenus.length) {
  console.log(`::error::${retenus.length} vulnerabilite(s) connue(s) au registre : aucune n'est toleree, quelle que soit sa gravite.`);
  process.exit(1);
}
