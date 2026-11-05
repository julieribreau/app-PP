// Aucune chaîne de requête d'URL vers Sentry.
//
// POURQUOI CE FICHIER EXISTE. `dataCollection` (data-collection.ts) ne couvre pas
// tout ce qui porte une URL. Vérifié sur le SDK 11 contre un faux point
// d'ingestion :
//   - côté web serveur, le SDK Next pose le chemin AVEC sa requête brute dans
//     `contexts.nextjs.request_path` (`/x?token=…&email=…`, en clair) ;
//   - côté navigateur, `request.url` est l'URL brute de la page ;
//   - les spans portent `url.full`, `http.target` et `user_agent.original`.
// `scrubEvent` (scrub.ts) masque une adresse écrite en clair, pas sa forme encodée
// d'URL (`a%40b.fr`), ni un jeton passé en paramètre (`?token=…`, `?code=…`).
//
// Règle : toute URL et tout chemin partent sans ce qui suit `?` (ni le fragment
// `#`). La méthode et le chemin restent : ils suffisent à situer l'erreur. Les
// fonctions modifient l'objet sur place et le retournent ; elles ne dépendent pas
// des types du SDK, qui diffèrent entre événement, span « streamé » (SDK 11,
// `attributes`) et span de transaction (`data`).
//
// Branchement, dans chaque `Sentry.init` (API, cron, web, mobile) : chaînées
// APRÈS le `beforeSend` existant, jamais à sa place. Garde-fou : init-partout.spec.

/** Une URL ou un chemin sans sa chaîne de requête ni son fragment. */
export function withoutQuery(url: string): string {
  const cut = url.search(/[?#]/);
  return cut === -1 ? url : url.slice(0, cut);
}

/** Attributs de span qui portent une URL : gardés, tronqués à leur chemin. */
const URL_ATTRIBUTES = ["url.full", "http.url", "http.target"];
/** Attributs de span retirés : la chaîne de requête seule, et l'agent utilisateur. */
const DROPPED_ATTRIBUTES = ["url.query", "http.query", "user_agent.original"];

type Loose = Record<string, unknown>;

function isLoose(value: unknown): value is Loose {
  return typeof value === "object" && value !== null;
}

/** Tronque une valeur d'URL, brute ou enveloppée (`{ value, type }` des spans v2). */
function truncateIn(holder: Loose, key: string): void {
  const value = holder[key];
  if (typeof value === "string") {
    holder[key] = withoutQuery(value);
  } else if (isLoose(value) && typeof value["value"] === "string") {
    value["value"] = withoutQuery(value["value"]);
  }
}

function scrubAttributes(attributes: unknown): void {
  if (!isLoose(attributes)) return;
  for (const key of DROPPED_ATTRIBUTES) delete attributes[key];
  for (const key of URL_ATTRIBUTES) truncateIn(attributes, key);
}

/**
 * `beforeSendSpan` : retire l'agent utilisateur et la chaîne de requête des
 * attributs d'URL, sous les deux formes de span (`attributes` et `data`).
 */
export function scrubSpan<T extends object>(span: T): T {
  const loose = span as Loose;
  scrubAttributes(loose["attributes"]);
  scrubAttributes(loose["data"]);
  return span;
}

/**
 * `beforeSend` (après `scrubEvent`) et `beforeSendTransaction` : retire la chaîne
 * de requête de `request.url`, `request.query_string`,
 * `contexts.nextjs.request_path`, `transaction`, des URL des breadcrumbs (`url`,
 * `from`, `to`), et nettoie `contexts.trace.data` et les spans d'une transaction
 * comme `scrubSpan`.
 */
export function stripQueryStrings<T extends object>(event: T): T {
  const loose = event as Loose;
  if (typeof loose["transaction"] === "string") {
    loose["transaction"] = withoutQuery(loose["transaction"]);
  }
  stripRequest(loose["request"]);
  stripContexts(loose["contexts"]);
  stripBreadcrumbs(loose["breadcrumbs"]);
  if (Array.isArray(loose["spans"])) {
    for (const span of loose["spans"]) if (isLoose(span)) scrubSpan(span);
  }
  return event;
}

function stripRequest(request: unknown): void {
  if (!isLoose(request)) return;
  delete request["query_string"];
  truncateIn(request, "url");
}

function stripContexts(contexts: unknown): void {
  if (!isLoose(contexts)) return;
  if (isLoose(contexts["nextjs"])) truncateIn(contexts["nextjs"], "request_path");
  if (isLoose(contexts["trace"])) scrubSpan(contexts["trace"]);
}

function stripBreadcrumbs(breadcrumbs: unknown): void {
  if (!Array.isArray(breadcrumbs)) return;
  for (const crumb of breadcrumbs) {
    if (!isLoose(crumb) || !isLoose(crumb["data"])) continue;
    for (const key of ["url", "from", "to"]) truncateIn(crumb["data"], key);
  }
}
