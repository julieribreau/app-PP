import { afterEach, describe, expect, it, vi } from "vitest";

import { loadSentryConfig } from "./sentry-config";

describe("loadSentryConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("lit l'environnement dans APP_ENV, jamais dans NODE_ENV", () => {
    // NODE_ENV vaut `production` dans toutes les images, préprod comprise.
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ENV", "preprod");
    vi.stubEnv("RELEASE", "sha-0123abc");
    expect(loadSentryConfig()).toEqual({
      dsn: undefined,
      environment: "preprod",
      release: "sha-0123abc",
    });
  });

  it("prend les valeurs de développement quand rien n'est posé", () => {
    vi.stubEnv("SENTRY_DSN", "");
    vi.stubEnv("APP_ENV", "");
    vi.stubEnv("RELEASE", "");
    expect(loadSentryConfig()).toEqual({
      dsn: undefined,
      environment: "development",
      release: "local",
    });
  });

  it("accepte un DSN de la région UE", () => {
    vi.stubEnv("SENTRY_DSN", "https://cle@o123.ingest.de.sentry.io/456");
    expect(loadSentryConfig().dsn).toBe("https://cle@o123.ingest.de.sentry.io/456");
  });

  it("refuse un DSN hors région UE", () => {
    vi.stubEnv("SENTRY_DSN", "https://cle@o123.ingest.us.sentry.io/456");
    expect(() => loadSentryConfig()).toThrow(/région UE/);
  });

  it("refuse un environnement inconnu", () => {
    vi.stubEnv("APP_ENV", "staging");
    expect(() => loadSentryConfig()).toThrow();
  });
});
