import { ApiError, createApiClient } from "@nutrion/api-port";

// Accès HTTP au backend, toujours par le proxy même origine de Next (/api → BACKEND_URL) :
// le navigateur garde les cookies de session et de panier (httpOnly) sans CORS.
export const API_BASE = "/api";

function withCredentials(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, { ...init, credentials: "include" });
}

async function readError(res: Response): Promise<ApiError> {
  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = text;
  }
  return new ApiError(res.status, (body as { code?: string } | undefined)?.code, body);
}

/** Client JSON (@nutrion/api-port) plus ce qu'il ne couvre pas : PUT, envoi de fichier, téléchargement. */
export function createHttp(locale: string) {
  const langHeaders = () => ({ "Accept-Language": locale });
  const json = createApiClient({ baseUrl: API_BASE, headers: langHeaders, fetch: withCredentials });

  async function raw(method: string, path: string, body?: BodyInit, type?: string) {
    const res = await withCredentials(`${API_BASE}${path}`, {
      method,
      headers: { ...langHeaders(), ...(type ? { "Content-Type": type } : {}) },
      body,
    });
    if (!res.ok) throw await readError(res);
    return res;
  }

  return {
    ...json,
    async put<T>(path: string, body: unknown): Promise<T> {
      const res = await raw("PUT", path, JSON.stringify(body), "application/json");
      const text = await res.text();
      return (text ? JSON.parse(text) : undefined) as T;
    },
    /** DELETE avec corps JSON (confirmation de suppression du compte). */
    async deleteWith<T>(path: string, body: unknown): Promise<T> {
      const res = await raw("DELETE", path, JSON.stringify(body), "application/json");
      const text = await res.text();
      return (text ? JSON.parse(text) : undefined) as T;
    },
    async upload<T>(path: string, file: File): Promise<T> {
      const form = new FormData();
      form.append("file", file);
      const res = await raw("PUT", path, form);
      return (await res.json()) as T;
    },
    async download(path: string): Promise<Blob> {
      const res = await raw("GET", path);
      return res.blob();
    },
  };
}

export type Http = ReturnType<typeof createHttp>;

export { ApiError };

/** Code d'erreur stable du backend (`VARIANT_OUT_OF_STOCK`…), sinon undefined. */
export function errorCode(error: unknown): string | undefined {
  return error instanceof ApiError ? error.code : undefined;
}

/** Propose le fichier reçu au téléchargement (export ZIP, CSV). */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** `?a=1&b=x` à partir d'un objet ; les valeurs vides sont omises. */
export function toQuery(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}
