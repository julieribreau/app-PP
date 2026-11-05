#!/usr/bin/env node
// OSV-Scanner sur les lockfiles du depot, et verdict.
// Meme script dans chaque depot Bullify qui scanne ses dependances, au
// formatage pres : chaque copie suit le prettier de son depot.
//
// Usage :
//   node scripts/check-osv.mjs package-lock.json mobile/package-lock.json
//   node scripts/check-osv.mjs backend/requirements.txt=backend/Dockerfile
//   node scripts/check-osv.mjs --rapport /tmp/osv.json package-lock.json
//
// `--rapport` ecrit les constats en JSON (failles retenues, exceptions caduques
// ou inutiles), que scripts/notify-ticketing.mjs envoie a Bullify Ticketing.
//
// Python : un requirements.txt ne porte que des plages. OSV en prend les bornes
// basses et, quand il resout lui-meme les transitives, il garde aussi les
// minimums, ignore la version de Python et abandonne des paquets (posthog sur
// Transcript). `fichier=Dockerfile` fait resoudre le fichier par pip, sans rien
// installer, dans l'image Python de ce Dockerfile : c'est la liste epinglee de
// ce qu'un build poserait aujourd'hui qui est scannee, transitives comprises.
// `fichier=image` nomme l'image directement.
//
// Echec (code 1) sur :
//   - toute vulnerabilite connue, quelle que soit sa gravite, y compris sans
//     score : aucune faille connue n'est toleree. Elles sont imprimees de la
//     plus grave a la moins grave ;
//   - une exception de osv-scanner.toml qui ne filtre plus rien ;
//   - une exception dont le paquet a publie une version que l'avis ne touche
//     pas. Une exception ne tient que tant qu'aucun correctif n'est publie sur
//     le registre : des qu'il l'est, monter la dependance, ou a defaut retirer
//     l'exception, et la vulnerabilite reapparait dans le releve ;
//   - un scanner, un registre ou une resolution qui ne repond pas : un silence
//     n'est pas un vert.

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

// Montee a la main : maj-externes.mjs ne suit que les images Docker Hub.
const OSV = "ghcr.io/google/osv-scanner:v2.6.0@sha256:afd838850ac1a0fcc15ff4a041dc9ba11123c3f0d2666217a5f0fcf9222b55fa";

const resolus = mkdtempSync(join(tmpdir(), "osv-"));
const docker = (...args) => {
  const r = spawnSync("docker", ["run", "--rm", "-v", `${process.cwd()}:/src:ro`, "-v", `${resolus}:/osv`, "-w", "/src", ...args], {
    encoding: "utf8",
    maxBuffer: 1 << 28,
  });
  if (r.error) throw r.error;
  return r;
};

// --- Resolution Python --------------------------------------------------------

function resoudre(fichier, python) {
  const image = existsSync(python)
    ? readFileSync(python, "utf8").match(/^FROM\s+(?:--platform=\S+\s+)?(\S+)/im)[1]
    : python;
  const git = readFileSync(fichier, "utf8").includes("git+")
    ? "apt-get update -qq && apt-get install -qq -y --no-install-recommends git > /dev/null && "
    : "";
  const r = docker(image, "sh", "-c",
    `${git}pip install -q --disable-pip-version-check --root-user-action=ignore ` +
    `--dry-run --ignore-installed --report /osv/rapport.json -r "${fichier}"`);
  if (r.status !== 0) throw new Error(`resolution de ${fichier} dans ${image} : sortie ${r.status}\n${r.stderr}`);
  const { install } = JSON.parse(readFileSync(join(resolus, "rapport.json"), "utf8"));
  const sortie = join(resolus, fichier);
  mkdirSync(dirname(sortie), { recursive: true });
  writeFileSync(sortie, install.map((p) => `${p.metadata.name}==${p.metadata.version}\n`).join(""));
  console.log(`${fichier} : ${install.length} paquets resolus par pip dans ${image}`);
  return `/osv/${fichier}`;
}

const args = process.argv.slice(2);
const iRapport = args.indexOf("--rapport");
const rapport = iRapport >= 0 ? args.splice(iRapport, 2)[1] : null;
const fichiers = args.map((arg) => {
  const [fichier, python] = arg.split("=");
  return python ? resoudre(fichier, python) : fichier;
});
if (!fichiers.length) throw new Error("aucun fichier a scanner");

// --- Scan ---------------------------------------------------------------------

// Sortie 0 : rien trouve, 1 : des vulnerabilites. Tout le reste est une panne.
function scanner(config) {
  const r = docker(OSV, "scan", "source", "--no-resolve", "--format", "json", "--config", config, ...fichiers);
  if (r.status !== 0 && r.status !== 1) throw new Error(`osv-scanner : sortie ${r.status}\n${r.stderr}`);
  const vulns = (JSON.parse(r.stdout).results ?? []).flatMap((res) =>
    (res.packages ?? []).flatMap((p) =>
      (p.groups ?? []).map((g) => ({
        cle: `${res.source.path}|${p.package.name}|${p.package.version}|${g.ids[0]}`,
        source: res.source.path.replace(/^\/(src|osv)\//, ""),
        paquet: p.package,
        ids: [...g.ids, ...(g.aliases ?? [])],
        score: Number(g.max_severity) || 0,
        titre: (p.vulnerabilities ?? []).find((x) => g.ids.includes(x.id))?.summary ?? null,
      })),
    ),
  );
  return { vulns, journal: r.stderr };
}

const config = existsSync("osv-scanner.toml") ? "osv-scanner.toml" : "/dev/null";
const retenu = scanner(config);
const brut = config === "/dev/null" ? retenu : scanner("/dev/null");
console.log(retenu.journal.trim());

const echecs = [];
const nom = (v) => `${v.paquet.name}@${v.paquet.version}`;

retenu.vulns.sort((a, b) => b.score - a.score);
for (const v of retenu.vulns) console.log(`${v.score ? v.score.toFixed(1) : "  ? "}  ${nom(v)}  ${v.ids[0]}  (${v.source})`);
console.log(`${retenu.vulns.length} vulnerabilite(s).`);
if (retenu.vulns.length) {
  echecs.push(`${retenu.vulns.length} vulnerabilite(s) connue(s) : aucune n'est toleree, quelle que soit sa gravite.`);
}

// --- Exceptions ---------------------------------------------------------------

if (/has unused ignores/.test(retenu.journal)) {
  echecs.push("osv-scanner.toml porte des exceptions qui ne filtrent plus rien : les retirer.");
}

const json = async (url, init) => {
  const r = await fetch(url, init);
  if (!r.ok) throw new Error(`${url} : HTTP ${r.status}`);
  return r.json();
};

async function derniereVersion({ ecosystem, name }) {
  if (ecosystem === "npm") {
    const doc = await json(`https://registry.npmjs.org/${name.replace("/", "%2f")}`, {
      headers: { accept: "application/vnd.npm.install-v1+json" },
    });
    return doc["dist-tags"].latest;
  }
  if (ecosystem === "PyPI") return (await json(`https://pypi.org/pypi/${name}/json`)).info.version;
  throw new Error(`registre non gere : ${ecosystem} (${name})`);
}

// L'avis tel qu'OSV l'applique : plages `fixed` comme `last_affected`, dans la
// semantique de version de l'ecosysteme.
async function touchee(paquet, version, ids) {
  const { vulns = [] } = await json("https://api.osv.dev/v1/query", {
    method: "POST",
    body: JSON.stringify({ package: { name: paquet.name, ecosystem: paquet.ecosystem }, version }),
  });
  return vulns.some((x) => [x.id, ...(x.aliases ?? [])].some((id) => ids.includes(id)));
}

const constats = [];
const constat = (kind, v, fix) => ({
  kind,
  advisoryId: v.ids[0],
  aliases: v.ids.slice(1),
  package: { ecosystem: v.paquet.ecosystem, name: v.paquet.name, version: v.paquet.version },
  file: v.source,
  score: v.score || null,
  tool: "osv",
  title: v.titre,
  fix,
});

// Pour chaque faille retenue : un correctif est-il publie ? C'est ce qui decide
// entre monter la dependance et poser une exception.
for (const v of retenu.vulns) {
  let fix = null;
  try {
    const derniere = await derniereVersion(v.paquet);
    fix = { published: !(await touchee(v.paquet, derniere, v.ids)), latestVersion: derniere };
  } catch (err) {
    console.log(`correctif de ${v.ids[0]} sur ${nom(v)} indetermine : ${err.message}`);
  }
  constats.push(constat("vulnerability", v, fix));
}

const vues = new Set(retenu.vulns.map((v) => v.cle));
for (const v of brut.vulns.filter((x) => !vues.has(x.cle))) {
  const derniere = await derniereVersion(v.paquet);
  if (await touchee(v.paquet, derniere, v.ids)) {
    console.log(`exception maintenue : ${v.ids[0]} sur ${nom(v)}, aucun correctif publie (derniere version : ${derniere})`);
  } else {
    constats.push(constat("stale_exception", v, { published: true, latestVersion: derniere }));
    echecs.push(
      `exception caduque : ${v.ids[0]} sur ${nom(v)} (${v.source}). ${v.paquet.name}@${derniere} est publiee ` +
        `et l'avis ne la touche pas : monter la dependance, ou retirer l'exception.`,
    );
  }
}

// Exceptions inutiles : osv-scanner les liste sous « has unused ignores: ».
const inutiles = retenu.journal.split("has unused ignores:")[1] ?? "";
for (const m of inutiles.matchAll(/^\s*-\s*(\S+)\s*$/gm)) {
  constats.push({ kind: "unused_exception", advisoryId: m[1], aliases: [], package: null, file: "osv-scanner.toml", score: null, tool: "osv", title: null, fix: null });
}

if (rapport) writeFileSync(rapport, JSON.stringify({ findings: constats }, null, 2));
for (const e of echecs) console.log(`::error::${e}`);
process.exit(echecs.length ? 1 : 0);
