import type { ArgumentsHost } from "@nestjs/common";
import { Logger, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// La règle de capture (≥ 500, hors santé) est testée dans packages/sentry ; l'envoi réel,
// dans le test d'intégration (test/sentry.e2e-spec.ts). Ici : ce que le filtre en fait.
const captureHttpException = vi.hoisted(() => vi.fn());
vi.mock("@nutrion/sentry", () => ({
  captureHttpException,
  withoutQuery: (url: string) => url.split(/[?#]/)[0],
}));

import { HttpExceptionFilter } from "./http-exception.filter";

function requete(url: string) {
  const res = {
    status: vi.fn().mockReturnThis(),
    type: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  const host = {
    switchToHttp: () => ({
      getRequest: () => ({ id: 7, method: "GET", url }),
      getResponse: () => res,
    }),
  } as unknown as ArgumentsHost;
  return { res, host };
}

describe("HttpExceptionFilter", () => {
  let erreurJournal: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    erreurJournal = vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    captureHttpException.mockReset();
  });

  it("rend une erreur inattendue en 500 problem+json, sans son message, et la signale", () => {
    captureHttpException.mockReturnValue(true);
    const { res, host } = requete("/v1/examples?token=secret");
    const err = new Error("connexion refusée à 10.0.0.3");

    new HttpExceptionFilter().catch(err, host);

    expect(captureHttpException).toHaveBeenCalledWith(err, {
      status: 500,
      url: "/v1/examples?token=secret",
      traceId: "7",
    });
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.type).toHaveBeenCalledWith("application/problem+json");
    expect(res.send).toHaveBeenCalledWith({
      type: "about:blank",
      title: "Internal Server Error",
      status: 500,
    });
    // Journalisée sans la chaîne de requête.
    expect(erreurJournal).toHaveBeenCalledWith(
      expect.objectContaining({ trace_id: "7", method: "GET", path: "/v1/examples" }),
      "HTTP 500",
    );
  });

  it("rend une 404 avec son titre, sans journal d'erreur", () => {
    captureHttpException.mockReturnValue(false);
    const { res, host } = requete("/v1/examples/inconnu");

    new HttpExceptionFilter().catch(new NotFoundException(), host);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({ type: "about:blank", title: "Not Found", status: 404 });
    expect(erreurJournal).not.toHaveBeenCalled();
  });

  it("laisse passer le corps de la sonde de santé, qui nomme la dépendance tombée", () => {
    captureHttpException.mockReturnValue(false);
    const { res, host } = requete("/v1/health/ready");
    const corps = { status: "error", details: { db: { status: "down", message: "timeout" } } };

    new HttpExceptionFilter().catch(new ServiceUnavailableException(corps), host);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(corps);
    expect(res.send).not.toHaveBeenCalled();
  });
});
