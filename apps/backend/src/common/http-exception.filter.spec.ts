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

import { AppError } from "./app-error";
import { HttpExceptionFilter } from "./http-exception.filter";

function requete(url: string) {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
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

  it("rend une erreur inattendue en 500 sans son message, et la signale", () => {
    captureHttpException.mockReturnValue(true);
    const { res, host } = requete("/v1/cart?token=secret");
    const err = new Error("connexion refusée à 10.0.0.3");

    new HttpExceptionFilter().catch(err, host);

    expect(captureHttpException).toHaveBeenCalledWith(err, {
      status: 500,
      url: "/v1/cart?token=secret",
      traceId: "7",
    });
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 500,
      code: "INTERNAL_ERROR",
      message: "Internal Server Error",
    });
    expect(erreurJournal).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/v1/cart", trace_id: "7" }),
      "HTTP 500",
    );
  });

  it("garde le code d'une erreur métier", () => {
    const { res, host } = requete("/v1/cart/items");
    new HttpExceptionFilter().catch(
      new AppError(409, "VARIANT_OUT_OF_STOCK", "Stock épuisé"),
      host,
    );
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 409,
      code: "VARIANT_OUT_OF_STOCK",
      message: "Stock épuisé",
    });
  });

  it("déduit le code du statut d'une exception Nest", () => {
    const { res, host } = requete("/v1/inconnue");
    new HttpExceptionFilter().catch(new NotFoundException("Cannot GET /v1/inconnue"), host);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 404,
      code: "NOT_FOUND",
      message: "Cannot GET /v1/inconnue",
    });
    expect(erreurJournal).not.toHaveBeenCalled();
  });

  it("laisse passer tel quel le corps d'une sonde de santé en échec", () => {
    const { res, host } = requete("/v1/health/ready");
    const corps = { status: "error", details: { db: { status: "down" } } };
    new HttpExceptionFilter().catch(new ServiceUnavailableException(corps), host);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(corps);
  });
});
