// Ce que le SDK Sentry a le droit de collecter de lui-même : rien de personnel.
//
// POURQUOI CE FICHIER EXISTE. La version 11 du SDK retire `sendDefaultPii` et
// le remplace par `dataCollection`, dont le défaut s'inverse : sans réglage,
// le SDK joint à chaque événement l'utilisateur et son adresse IP, les cookies,
// les en-têtes, les corps de requête et de réponse, les requêtes SQL et les
// entrées et sorties des modèles de langage. Un corps de requête peut
// porter l'identité d'un usager, parfois d'un mineur.
//
// Cet objet fige, pour chaque `Sentry.init` du dépôt passé en 11, ce que
// `sendDefaultPii: false` garantissait en 10, en plus strict : aucun en-tête
// (la 10 en gardait, IP et cookies retirés). Seuls les paramètres d'URL restent
// collectés comme en 10, filtrés par la liste de clés sensibles du SDK (`token`,
// `auth`, `session`…) et par les clés d'adresse IP ci-dessous.
//
// Il ne remplace pas `scrubEvent` : ce filtre-ci dit ce que le SDK ATTACHE, pas
// ce que NOTRE code met dans un message ou un fil d'Ariane.
//
// Import de type seul : rien de `@sentry/node` n'entre dans le bundle navigateur.
import type { NodeOptions } from "@sentry/node";

export type DataCollection = NonNullable<NodeOptions["dataCollection"]>;

// Clés d'adresse IP retirées des paramètres d'URL, reprises du guide de
// migration 10 → 11 (« keep the v10 default behavior »).
const CLES_ADRESSE_IP = ["forwarded", "-ip", "remote-", "via", "-user"];

export const SANS_DONNEES_PERSONNELLES: DataCollection = {
  // Ni `user.ip_address` déduite de la requête, ni `user.*` rempli par les
  // intégrations. Un `Sentry.setUser` explicite du code reste le seul chemin.
  userInfo: false,
  cookies: false,
  httpHeaders: { request: false, response: false },
  // Tableau vide = aucun corps, ni entrant ni sortant, ni requête ni réponse.
  httpBodies: [],
  urlQueryParams: { deny: CLES_ADRESSE_IP },
  graphQL: { document: false, variables: false },
  genAI: { inputs: false, outputs: false },
  // Entrées et sorties des outils MCP (SDK 11.11) : comme genAI, jamais.
  mcp: { inputs: false, outputs: false },
  databaseQueryData: false,
  queues: false,
  // Valeurs des variables locales dans les frames : jamais.
  stackFrameVariables: false,
};
