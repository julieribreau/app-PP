import { describe, expect, it, vi } from "vitest";
import { ApiError, createApiClient } from "./index";

const reponse = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status });

describe("createApiClient", () => {
  it("envoie l'URL de base, les en-têtes et le corps JSON", async () => {
    const fetch = vi.fn().mockResolvedValue(reponse(200, { id: "1" }));
    const api = createApiClient({
      baseUrl: "https://api.test/v1",
      headers: () => ({ "Accept-Language": "fr" }),
      fetch,
    });

    await expect(api.post("/examples", { nom: "a" })).resolves.toEqual({ id: "1" });
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe("https://api.test/v1/examples");
    expect(init.headers).toMatchObject({
      "Accept-Language": "fr",
      "Content-Type": "application/json",
    });
    expect(init.body).toBe('{"nom":"a"}');
  });

  it("lève une ApiError avec le statut et le code du backend", async () => {
    const fetch = vi.fn().mockResolvedValue(reponse(403, { code: "LEGAL_CONSENT_REQUIRED" }));
    const erreur = await createApiClient({ baseUrl: "", fetch })
      .get("/x")
      .catch((e: unknown) => e);

    expect(erreur).toBeInstanceOf(ApiError);
    expect(erreur).toMatchObject({ status: 403, code: "LEGAL_CONSENT_REQUIRED" });
  });

  it("accepte une réponse vide (204)", async () => {
    const fetch = vi.fn().mockResolvedValue(reponse(204));
    await expect(createApiClient({ baseUrl: "", fetch }).delete("/x")).resolves.toBeUndefined();
  });
});
