// Retrait des données personnelles avant envoi à Sentry.
//
// POURQUOI CE FICHIER EXISTE. `dataCollection: SANS_DONNEES_PERSONNELLES` (SDK
// 11) et `sendDefaultPii: false` (React Native, SDK 10) empêchent le SDK
// d'ATTACHER l'adresse IP, les en-têtes et le corps de requête. Ils ne font rien
// contre ce que NOTRE code met lui-même dans un événement : un message d'exception qui
// interpole une adresse électronique, un fil d'Ariane qui porte une URL avec des
// paramètres, un `extra` ajouté à la main. C'est ce chemin-là qui fuit.
//
// L'ENJEU CONTRACTUEL. Le DPA Sentry interdit de lui envoyer des données de
// l'article 9 du RGPD (santé, situation sociale…), et ses propres obligations ne
// s'appliquent plus à ce qui en relève. Or une pièce justificative déposée par un usager
// peut révéler un handicap ou une situation sociale, et son seul NOM DE FICHIER suffit
// souvent à en révéler la nature. Une exception levée pendant le traitement d'un dépôt
// est donc le vecteur réaliste d'un manquement à l'accord passé avec Sentry, en plus du
// manquement envers le client.
//
// Le retrait est volontairement LARGE plutôt que précis : sur ce chemin, laisser
// passer une adresse coûte plus cher que masquer une chaîne anodine.

const REDACTED = "[retiré]";

/** Profondeur maximale de descente. Un événement Sentry réel ne dépasse pas 6-7 niveaux. */
const MAX_DEPTH = 12;

const PATTERNS: ReadonlyArray<readonly [RegExp, string]> = [
  // Adresse électronique. C'est la fuite la plus fréquente dans un message
  // d'exception, et la précision du motif importe moins que de n'en laisser
  // passer aucune.
  [/[\w.+-]+@[\w-]+\.[\w.-]+/g, REDACTED],
  // Téléphone français, avec ou sans indicatif, séparé par espaces, points ou tirets.
  [/(?:\+33|0)\s?[1-9](?:[\s.:-]?\d{2}){4}/g, REDACTED],
  // Chemin d'un fichier déposé par un usager : photo de profil, pièce jointe, et surtout
  // pièce justificative (`uploads/<dossier>/<userId>/<slug>-<uuid>.jpg`). Les clés de
  // stockage objet du projet commencent par `uploads/` pour que ce motif les couvre. On
  // garde le préfixe pour que l'erreur reste diagnosticable, on retire le reste.
  [/uploads\/[^\s"')\]]+/g, `uploads/${REDACTED}`],
];

function scrubString(value: string): string {
  let out = value;
  for (const [pattern, replacement] of PATTERNS) {
    // `lastIndex` : les motifs sont globaux et partagés entre appels, il faut le
    // remettre à zéro sinon un `replace` sur deux repart au milieu de la chaîne.
    pattern.lastIndex = 0;
    out = out.replace(pattern, replacement);
  }
  return out;
}

/**
 * Applique le retrait à toutes les chaînes d'un événement, en profondeur.
 *
 * Un balayage générique plutôt qu'une liste de champs : la forme d'un événement
 * Sentry varie avec le SDK, les intégrations et ce que l'appelant y ajoute. Viser
 * `message`, `exception.values[].value` et `breadcrumbs[].message` nommément
 * laisserait passer le prochain champ que le SDK ajoutera.
 *
 * Ne modifie pas l'entrée : retourne une copie.
 */
export function scrubEvent<T>(value: T): T {
  return walk(value, 0) as T;
}

function walk(value: unknown, depth: number): unknown {
  if (depth > MAX_DEPTH) return value;
  if (typeof value === "string") return scrubString(value);
  if (Array.isArray(value)) return value.map((item) => walk(item, depth + 1));
  // Les objets à prototype exotique (Error, Date, Buffer) sont laissés tels
  // quels : les recopier champ à champ les casserait, et le SDK les a déjà
  // sérialisés en objets simples au moment du `beforeSend`.
  if (value !== null && typeof value === "object" && isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) out[key] = walk(item, depth + 1);
    return out;
  }
  return value;
}

function isPlainObject(value: object): boolean {
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}
