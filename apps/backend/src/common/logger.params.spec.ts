import { describe, expect, it } from "vitest";

import { loggerParams } from "./logger.params";

type Options = {
  base: Record<string, string>;
  genReqId: (req: { headers: Record<string, unknown> }) => string;
  serializers: { req: (req: object) => object; res: (res: object) => object };
};

const options = (service: "api" | "cron") => loggerParams(service).pinoHttp as unknown as Options;

describe("loggerParams", () => {
  it("nomme le process et l'environnement logique", () => {
    expect(options("cron").base).toEqual({ service: "nutrion-app-cron", env: "development" });
  });

  it("journalise une requête sans en-têtes, chaîne de requête ni adresse IP", () => {
    const ligne = options("api").serializers.req({
      id: "r1",
      method: "POST",
      url: "/v1/examples?token=SECRET",
      query: { token: "SECRET" },
      headers: { cookie: "session=abc", authorization: "Bearer xyz" },
      remoteAddress: "203.0.113.7",
    });
    expect(ligne).toEqual({ id: "r1", method: "POST", path: "/v1/examples" });
  });

  it("ne garde de la réponse que son statut", () => {
    expect(
      options("api").serializers.res({ statusCode: 201, headers: { "set-cookie": "x" } }),
    ).toEqual({
      statusCode: 201,
    });
  });

  it("reprend l'identifiant de requête reçu, sinon en crée un", () => {
    const { genReqId } = options("api");
    expect(genReqId({ headers: { "x-request-id": "amont-42" } })).toBe("amont-42");
    expect(genReqId({ headers: {} })).toMatch(/^[0-9a-f-]{36}$/);
    expect(genReqId({ headers: { "x-request-id": "x".repeat(500) } })).toMatch(/^[0-9a-f-]{36}$/);
  });
});
