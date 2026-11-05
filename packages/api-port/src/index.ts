// Port d'accès au backend (cf architecture-reference §Hexagonal). Web et mobile appellent l'API
// uniquement par ce client : un seul endroit pour l'URL de base, la session, la langue, le
// tenant et la lecture des erreurs. Les types d'un domaine se rangent dans src/<domaine>/.

/** Erreur normalisée renvoyée par le backend (problem+json). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | undefined,
    readonly body: unknown,
  ) {
    super(`API ${status}${code ? ` ${code}` : ""}`);
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  /** En-têtes ajoutés à chaque appel : session (jeton), langue, tenant. */
  headers?: () => Record<string, string> | Promise<Record<string, string>>;
  fetch?: typeof fetch;
}

export function createApiClient({ baseUrl, headers, fetch: doFetch = fetch }: ApiClientOptions) {
  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await doFetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(await headers?.()),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    const data: unknown = text ? JSON.parse(text) : undefined;
    if (!res.ok) {
      const code = (data as { code?: string } | undefined)?.code;
      throw new ApiError(res.status, code, data);
    }
    return data as T;
  }

  return {
    get: <T>(path: string) => request<T>("GET", path),
    post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
    patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
    delete: <T>(path: string) => request<T>("DELETE", path),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
