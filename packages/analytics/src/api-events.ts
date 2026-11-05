import { PERSONAL_KEYS } from "./events";
import { type ApiCall, type TrackedEvent } from "./rule-kit";
import { adminRules } from "./rules-admin";
import { shopRules } from "./rules-shop";

export type { ApiCall, EventName, TrackedEvent } from "./rule-kit";

const rules = [...shopRules, ...adminRules];

/** Le chemin seul, sans hôte, requête ni préfixe `/api` du proxy web. */
export function normalizePath(urlOrPath: string): string {
  let path = urlOrPath;
  const scheme = path.indexOf("://");
  if (scheme >= 0) path = path.slice(path.indexOf("/", scheme + 3));
  path = path.split("?")[0]!.split("#")[0]!;
  if (path.startsWith("/api/")) path = path.slice(4);
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

/** Retire toute propriété personnelle qui se serait glissée (défense en profondeur). */
export function scrubProperties<T extends object>(properties: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
    if ((PERSONAL_KEYS as readonly string[]).includes(key)) continue;
    out[key] = value;
  }
  return out as T;
}

/** L'événement métier d'un appel d'API, ou `null` si l'appel n'en porte pas. */
export function eventForApiCall(call: ApiCall): TrackedEvent | null {
  const method = call.method.toUpperCase();
  const path = normalizePath(call.path);
  const ok = call.status >= 200 && call.status < 300;
  for (const rule of rules) {
    if (rule.method !== method) continue;
    const match = rule.pattern.exec(path);
    if (!match) continue;
    const params = match.slice(1).map((p) => decodeURIComponent(p));
    const event = ok ? rule.map(call, params) : (rule.onError?.(call, params) ?? null);
    return event
      ? ({ ...event, properties: scrubProperties(event.properties) } as TrackedEvent)
      : null;
  }
  return null;
}
