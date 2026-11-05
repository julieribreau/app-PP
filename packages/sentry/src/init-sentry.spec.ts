import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { withinDailyBudget } from "./init-sentry";

// Le plafond quotidien est le seul garde-fou contre l'épuisement du quota
// mensuel Sentry, commun à toute l'organisation et sans plafond par clé.
describe("withinDailyBudget", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-26T10:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("laisse passer 150 events puis coupe", () => {
    const passed = Array.from({ length: 200 }, () => withinDailyBudget());
    expect(passed.filter(Boolean)).toHaveLength(150);
    expect(passed.slice(0, 150).every(Boolean)).toBe(true);
    expect(passed.slice(150).some(Boolean)).toBe(false);
  });

  it("remet le compteur à zéro au changement de jour UTC", () => {
    for (let i = 0; i < 200; i += 1) withinDailyBudget();
    expect(withinDailyBudget()).toBe(false);

    vi.setSystemTime(new Date("2026-08-27T00:00:01Z"));
    expect(withinDailyBudget()).toBe(true);
  });
});
