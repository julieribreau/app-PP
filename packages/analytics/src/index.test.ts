import { describe, expect, it, vi } from "vitest";

import { POSTHOG_EU_HOST, superProperties, track } from "./index";

describe("analytics", () => {
  it("vise l'ingestion de l'instance UE", () => {
    expect(POSTHOG_EU_HOST).toBe("https://eu.i.posthog.com");
  });

  it("marque chaque événement de l'environnement et de la surface", () => {
    expect(superProperties("preprod", "web")).toEqual({ app_env: "preprod", platform: "web" });
    expect(superProperties(undefined, "mobile")).toEqual({
      app_env: "development",
      platform: "mobile",
    });
  });

  it("n'envoie qu'un événement du catalogue, et rien sans client", () => {
    const client = { capture: vi.fn() };
    track(client, "product.viewed", { productId: "p1", slug: "avoine" });
    expect(client.capture).toHaveBeenCalledWith("product.viewed", {
      productId: "p1",
      slug: "avoine",
    });
    expect(() => track(null, "auth.logged_out", {})).not.toThrow();
    // @ts-expect-error nom hors catalogue : refusé à la compilation
    track(client, "example.unknown", {});
  });
});
