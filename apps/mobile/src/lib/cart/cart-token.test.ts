import { describe, expect, it, vi } from "vitest";

import { CART_TOKEN_KEY, createCartTokenStore, type KeyValueStore } from "./cart-token";

function memory(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const store: KeyValueStore = {
    getItemAsync: vi.fn(async (key: string) => data.get(key) ?? null),
    setItemAsync: vi.fn(async (key: string, value: string) => void data.set(key, value)),
    deleteItemAsync: vi.fn(async (key: string) => void data.delete(key)),
  };
  return { store, data };
}

const headers = (token?: string) => new Headers(token ? { "X-Cart-Token": token } : {});

describe("jeton du panier invité", () => {
  it("lit le trousseau une seule fois", async () => {
    const { store } = memory({ [CART_TOKEN_KEY]: "abc" });
    const tokens = createCartTokenStore(store);
    expect(await tokens.get()).toBe("abc");
    expect(await tokens.get()).toBe("abc");
    expect(store.getItemAsync).toHaveBeenCalledTimes(1);
  });

  it("garde le jeton renvoyé par le backend, sans réécrire un jeton inchangé", async () => {
    const { store, data } = memory();
    const tokens = createCartTokenStore(store);
    await tokens.captureFrom(headers("t1"));
    await tokens.captureFrom(headers("t1"));
    await tokens.captureFrom(headers());
    expect(data.get(CART_TOKEN_KEY)).toBe("t1");
    expect(store.setItemAsync).toHaveBeenCalledTimes(1);
  });

  it("oublie le jeton après la fusion", async () => {
    const { store, data } = memory({ [CART_TOKEN_KEY]: "abc" });
    const tokens = createCartTokenStore(store);
    await tokens.clear();
    expect(await tokens.get()).toBeNull();
    expect(data.has(CART_TOKEN_KEY)).toBe(false);
  });
});
