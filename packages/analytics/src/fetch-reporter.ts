import { type CaptureClient, trackApiCall } from "./capture";

function parse(text: unknown): unknown {
  if (typeof text !== "string" || !text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

/**
 * Après chaque appel au backend : l'événement métier correspondant, s'il y en a un. Ne consomme
 * pas la réponse (lecture sur un clone) et n'échoue jamais : la mesure ne casse pas l'appel.
 */
export async function reportFetch(
  client: CaptureClient | null,
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  response: Response,
): Promise<void> {
  if (!client) return;
  try {
    const method =
      init?.method ?? (typeof input === "object" && "method" in input ? input.method : "GET");
    const type = response.headers.get("content-type") ?? "";
    const responseBody = type.includes("json")
      ? await response
          .clone()
          .json()
          .catch(() => undefined)
      : undefined;
    trackApiCall(client, {
      method,
      path: urlOf(input),
      status: response.status,
      requestBody: parse(init?.body),
      responseBody,
    });
  } catch {
    // La mesure d'audience ne fait jamais échouer un appel.
  }
}

/** Un `fetch` qui rapporte ses appels au client courant (null tant que l'usager n'a pas consenti). */
export function withApiEvents(
  doFetch: typeof fetch,
  getClient: () => CaptureClient | null,
): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await doFetch(input, init);
    void reportFetch(getClient(), input, init, response);
    return response;
  }) as typeof fetch;
}
