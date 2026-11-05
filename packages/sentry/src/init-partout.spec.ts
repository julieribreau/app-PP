// Toute initialisation de Sentry du dépôt doit porter les deux protections.
//
// POURQUOI CE TEST EXISTE. Un `Sentry.init` écrit à la main dans une app (web, mobile)
// sans le nettoyage commun ne se voit nulle part, ni à l'exécution, ni à la revue. Or
// le chemin qui fuit est justement celui des fronts, puisque c'est là que l'usager saisit.
//
// Le socle l'écrit en toutes lettres : la collecte automatique du SDK coupée et écrite
// explicitement, et un `beforeSend` qui retire ce que le message transporte, les deux
// étant des choses différentes. Ce test fige la phrase.
//
// SDK 11 (`@sentry/nextjs`, `@sentry/node`) : `sendDefaultPii` n'existe plus et son
// absence ne protège plus, le défaut collecte tout. Ces fichiers posent
// `dataCollection: SANS_DONNEES_PERSONNELLES`. `@sentry/react-native` 8 repose encore
// sur le SDK 10 : pour lui, `sendDefaultPii: false` reste la protection.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const RACINE = new URL("../../..", import.meta.url).pathname;
const IGNORES = new Set(["node_modules", "dist", ".next", ".expo", ".git", "coverage"]);

function fichiers(dossier: string, trouves: string[] = []): string[] {
  for (const entree of readdirSync(dossier)) {
    if (IGNORES.has(entree)) continue;
    const chemin = join(dossier, entree);
    if (statSync(chemin).isDirectory()) fichiers(chemin, trouves);
    else if (/\.tsx?$/.test(entree) && !/\.(spec|test)\.tsx?$/.test(entree)) trouves.push(chemin);
  }
  return trouves;
}

const sources = fichiers(join(RACINE, "apps")).concat(fichiers(join(RACINE, "packages")));
const lire = (relatif: string) => readFileSync(join(RACINE, relatif), "utf8");
const relatifs = (liste: string[]) => liste.map((f) => [f.slice(RACINE.length)]);

describe("Sentry.init, partout dans le dépôt", () => {
  const initialisations = sources.filter((f) =>
    /\bSentry\.init\s*\(/.test(readFileSync(f, "utf8")),
  );

  it("il y a bien des initialisations à contrôler", () => {
    // Sans ça, un test qui ne trouve plus rien passerait au vert. API et cron
    // (init-sentry.ts), web serveur et navigateur, mobile.
    expect(initialisations.length).toBeGreaterThanOrEqual(1);
  });

  it.each(relatifs(initialisations))("%s coupe la collecte de données personnelles du SDK", (f) => {
    const source = lire(f);
    if (/from "@sentry\/react-native"/.test(source)) {
      expect(source).toMatch(/sendDefaultPii:\s*false/);
    } else {
      expect(source).toMatch(/dataCollection:\s*SANS_DONNEES_PERSONNELLES/);
      expect(source).not.toMatch(/sendDefaultPii/);
    }
  });

  // `dataCollection` laisse passer la chaîne de requête des URL (chemin brut de
  // `contexts.nextjs.request_path`, URL de la page, URL des fils d'Ariane) et l'agent
  // utilisateur des spans : cf strip-query.ts.
  it.each(relatifs(initialisations))("%s nettoie événements, transactions et spans", (f) => {
    const source = lire(f);
    expect(source).toMatch(/stripQueryStrings\(scrubEvent\(event\)\)/);
    expect(source).toMatch(/beforeSendTransaction:\s*stripQueryStrings/);
    expect(source).toMatch(/beforeSendSpan:\s*scrubSpan/);
  });

  it.each(relatifs(initialisations))("%s lit son environnement dans APP_ENV", (f) => {
    // NODE_ENV vaut `production` dans les images de préprod comme de prod.
    const source = lire(f);
    expect(source).toMatch(/APP_ENV|loadSentryConfig/);
    expect(source).not.toMatch(/environment:\s*process\.env\.?\[?["']?NODE_ENV/);
  });
});

describe("Sentry.setUser, partout dans le dépôt", () => {
  // Socle §Souveraineté : l'identifiant et rien d'autre (ni adresse, ni nom, ni rôle).
  const appels = sources.flatMap((f) =>
    [...readFileSync(f, "utf8").matchAll(/setUser\(([^)]*)\)/g)].map((m) => [
      f.slice(RACINE.length),
      m[1]?.trim() ?? "",
    ]),
  );

  // Le starter n'identifie personne : la liste est vide jusqu'au premier module d'auth.
  it("chaque appel est contrôlé ci-dessous", () => {
    expect(Array.isArray(appels)).toBe(true);
  });

  it.each(appels)("%s n'envoie que l'identifiant : setUser(%s)", (_f, argument) => {
    expect(argument).toMatch(/^(null|\{\s*id(:\s*[\w.?[\]"']+)?\s*\})$/);
  });
});
