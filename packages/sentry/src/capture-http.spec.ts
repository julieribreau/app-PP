import { beforeEach, describe, expect, it, vi } from "vitest";

const captureException = vi.hoisted(() => vi.fn());
vi.mock("@sentry/node", () => ({ captureException }));

import { captureHttpException } from "./capture-http";

describe("captureHttpException", () => {
  beforeEach(() => {
    captureException.mockClear();
  });

  it("envoie une erreur serveur, avec le sous-système et l'identifiant de requête", () => {
    const err = new Error("boom");
    expect(captureHttpException(err, { status: 500, url: "/v1/examples", traceId: "req-1" })).toBe(
      true,
    );
    expect(captureException).toHaveBeenCalledWith(err, {
      tags: { subsystem: "http", trace_id: "req-1" },
    });
  });

  it("envoie un 503 levé par une route métier", () => {
    expect(captureHttpException(new Error("amont"), { status: 503, url: "/v1/payments" })).toBe(
      true,
    );
    expect(captureException).toHaveBeenCalledWith(expect.any(Error), {
      tags: { subsystem: "http" },
    });
  });

  it("n'envoie pas une réponse prévisible (4xx)", () => {
    for (const status of [400, 401, 403, 404, 409, 422, 429]) {
      expect(captureHttpException(new Error("x"), { status, url: "/v1/examples" })).toBe(false);
    }
    expect(captureException).not.toHaveBeenCalled();
  });

  it("n'envoie pas le 503 attendu d'une route de santé", () => {
    for (const url of ["/v1/health", "/v1/health/ready", "/v1/health/ready?x=1", "/ready"]) {
      expect(captureHttpException(new Error("db down"), { status: 503, url })).toBe(false);
    }
    expect(captureException).not.toHaveBeenCalled();
  });

  it("ne confond pas une route métier qui contient « health » avec une sonde", () => {
    expect(captureHttpException(new Error("x"), { status: 500, url: "/v1/healthcare-plans" })).toBe(
      true,
    );
  });
});
