import { describe, expect, it } from "vitest";

import { hashCartToken, newCartToken, readCartToken } from "./cart-token";

describe("jeton de panier invité", () => {
  const token = newCartToken();

  it("se lit dans l'en-tête ou le cookie", () => {
    expect(readCartToken({ "x-cart-token": token })).toBe(token);
    expect(readCartToken({ cookie: `a=1; nutrion_cart=${token}; b=2` })).toBe(token);
  });

  it("refuse une valeur malformée", () => {
    expect(readCartToken({ "x-cart-token": "court" })).toBeNull();
    expect(readCartToken({})).toBeNull();
  });

  it("se hache de façon stable", () => {
    expect(hashCartToken(token)).toBe(hashCartToken(token));
    expect(hashCartToken(token)).toHaveLength(64);
  });
});
