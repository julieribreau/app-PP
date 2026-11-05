import { describe, expect, it, vi } from "vitest";

import { createCartTokenStore } from "@/lib/cart/cart-token";

import { createAppFetch } from "./app-fetch";

function memoryTokens(token: string | null) {
  let value = token;
  return createCartTokenStore({
    getItemAsync: async () => value,
    setItemAsync: async (_k, v) => void (value = v),
    deleteItemAsync: async () => void (value = null),
  });
}

describe("fetch de l'app", () => {
  it("ajoute la langue, la session et le jeton invité", async () => {
    const spy = vi.fn(async () => new Response("{}", { status: 200 }));
    const appFetch = createAppFetch({
      getLocale: () => "en",
      getCookie: async () => "better-auth.session_token=xyz",
      cartTokens: memoryTokens("guest-1"),
      fetch: spy as unknown as typeof fetch,
    });
    await appFetch("http://api/v1/cart");
    const headers = new Headers((spy.mock.calls[0] as unknown as [string, RequestInit])[1].headers);
    expect(headers.get("Accept-Language")).toBe("en");
    expect(headers.get("Cookie")).toBe("better-auth.session_token=xyz");
    expect(headers.get("X-Cart-Token")).toBe("guest-1");
  });

  it("n'envoie ni cookie ni jeton absents, et relève le jeton de la réponse", async () => {
    const tokens = memoryTokens(null);
    const spy = vi.fn(
      async () => new Response("{}", { status: 201, headers: { "X-Cart-Token": "new" } }),
    );
    const appFetch = createAppFetch({
      getLocale: () => "fr",
      getCookie: async () => "",
      cartTokens: tokens,
      fetch: spy as unknown as typeof fetch,
    });
    await appFetch("http://api/v1/cart/items", { method: "POST" });
    const headers = new Headers((spy.mock.calls[0] as unknown as [string, RequestInit])[1].headers);
    expect(headers.has("Cookie")).toBe(false);
    expect(headers.has("X-Cart-Token")).toBe(false);
    expect(await tokens.get()).toBe("new");
  });
});
