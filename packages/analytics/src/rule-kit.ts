import type { EventCatalog } from "./events";

export type EventName = keyof EventCatalog;

/** Un événement prêt à partir, typé par le catalogue. */
export type TrackedEvent = {
  [N in EventName]: { name: N; properties: EventCatalog[N] };
}[EventName];

/** Un appel d'API terminé, tel que la couche HTTP du web ou du mobile le voit. */
export interface ApiCall {
  readonly method: string;
  /** Chemin sans hôte ni requête : `/v1/cart/items/abc`. Un préfixe `/api` (proxy web) est toléré. */
  readonly path: string;
  readonly status: number;
  readonly requestBody?: unknown;
  readonly responseBody?: unknown;
}

type Json = Record<string, unknown>;
export const obj = (v: unknown): Json => (v && typeof v === "object" ? (v as Json) : {});
export const str = (v: unknown): string => (typeof v === "string" ? v : "");
export const num = (v: unknown): number => (typeof v === "number" ? v : 0);

export function cartTotals(body: unknown): { itemCount: number; totalCents: number } {
  const b = obj(body);
  return { itemCount: num(b["itemCount"]), totalCents: num(b["totalCents"]) };
}

export function errorCode(body: unknown, status: number): string {
  return str(obj(body)["code"]) || `HTTP_${status}`;
}

export function variantCount(body: unknown): number {
  const v = obj(body)["variants"];
  return Array.isArray(v) ? v.length : 0;
}

export const ID = "([^/]+)";

export type Rule = {
  readonly method: string;
  readonly pattern: RegExp;
  readonly map: (call: ApiCall, params: string[]) => TrackedEvent | null;
  /** Par défaut seuls les succès (2xx) donnent un événement ; certains suivent aussi l'échec. */
  readonly onError?: (call: ApiCall, params: string[]) => TrackedEvent | null;
};
