// `dataCollection` ne couvre pas les URL : le SDK Next pose le chemin avec sa
// requête brute dans `contexts.nextjs.request_path`, le navigateur envoie l'URL
// brute de la page, et les spans portent l'URL complète et l'agent utilisateur.
// Un secret passé en paramètre d'URL ne doit pas sortir.
import { afterEach, describe, expect, it, vi } from "vitest";

import { scrubSpan, stripQueryStrings, withoutQuery } from "./strip-query";

const SECRET = "token=SECRET123&email=a@b.fr";

describe("withoutQuery", () => {
  it("garde le chemin, sans requête ni fragment", () => {
    expect(withoutQuery(`/v1/x?${SECRET}`)).toBe("/v1/x");
    expect(withoutQuery(`https://h.example/a/b?${SECRET}#frag`)).toBe("https://h.example/a/b");
    expect(withoutQuery("/a#access_token=x")).toBe("/a");
    expect(withoutQuery("/a/b")).toBe("/a/b");
  });
});

describe("stripQueryStrings", () => {
  it("retire la requête de chaque URL et chemin d'un événement", () => {
    const event = stripQueryStrings({
      transaction: `GET /x?${SECRET}`,
      request: { method: "GET", url: `http://h/x?${SECRET}`, query_string: SECRET },
      contexts: {
        nextjs: { request_path: `/x?${SECRET}`, router_kind: "App Router" },
        trace: { data: { "http.target": `/x?${SECRET}`, "user_agent.original": "UA" } },
      },
      breadcrumbs: [
        { category: "fetch", data: { url: `https://h/doc?${SECRET}`, method: "GET" } },
        { category: "navigation", data: { from: `/a?${SECRET}`, to: `/b?${SECRET}` } },
        { category: "console", message: "sans data" },
      ],
      spans: [{ data: { "url.full": `https://h/doc?${SECRET}`, "url.query": SECRET } }],
    });

    expect(JSON.stringify(event)).not.toMatch(/SECRET123|a@b\.fr|UA/);
    expect(event).toEqual({
      transaction: "GET /x",
      request: { method: "GET", url: "http://h/x" },
      contexts: {
        nextjs: { request_path: "/x", router_kind: "App Router" },
        trace: { data: { "http.target": "/x" } },
      },
      breadcrumbs: [
        { category: "fetch", data: { url: "https://h/doc", method: "GET" } },
        { category: "navigation", data: { from: "/a", to: "/b" } },
        { category: "console", message: "sans data" },
      ],
      spans: [{ data: { "url.full": "https://h/doc" } }],
    });
  });

  it("laisse intact ce qui ne porte pas d'URL", () => {
    expect(stripQueryStrings({ tags: { app: "backend" } })).toEqual({ tags: { app: "backend" } });
  });
});

describe("scrubSpan", () => {
  it("nettoie un span sous ses deux formes, brute ou typée", () => {
    expect(
      scrubSpan({
        name: "GET /x",
        attributes: {
          "http.request.method": "GET",
          "url.full": { value: `http://h/x?${SECRET}`, type: "string" },
          "http.target": `/x?${SECRET}`,
          "http.query": SECRET,
          "user_agent.original": "Mozilla/5.0",
        },
      }),
    ).toEqual({
      name: "GET /x",
      attributes: {
        "http.request.method": "GET",
        "url.full": { value: "http://h/x", type: "string" },
        "http.target": "/x",
      },
    });
    expect(scrubSpan({ data: { "http.url": `http://h/x?${SECRET}`, "url.query": "?a" } })).toEqual({
      data: { "http.url": "http://h/x" },
    });
  });

  it("ne touche pas au nom d'un span SQL", () => {
    expect(scrubSpan({ name: "SELECT * FROM t WHERE a = $1 OR b = ?" })).toEqual({
      name: "SELECT * FROM t WHERE a = $1 OR b = ?",
    });
  });
});

// Branchement de l'API et du cron : `initSentry` chaîne le nettoyage APRÈS
// `scrubEvent`, sans le remplacer, et branche transactions et spans.
const init = vi.fn();
vi.mock("@sentry/node", () => ({ init }));

describe("initSentry", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    init.mockClear();
  });

  it("chaîne le nettoyage des URL au retrait des données personnelles", async () => {
    vi.stubEnv("SENTRY_DSN", "http://cle@127.0.0.1:9/1");
    const { initSentry } = await import("./init-sentry");
    initSentry({ appTag: "api" });

    expect(init).toHaveBeenCalledTimes(1);
    const options = init.mock.calls[0]?.[0];
    const event = options.beforeSend(
      {
        message: "échec pour parent@exemple.fr",
        request: { url: `http://h/v1/x?${SECRET}`, method: "GET" },
      },
      {},
    );
    // scrubEvent a tourné (adresse retirée), puis le nettoyage des URL.
    expect(event).toEqual({
      message: "échec pour [retiré]",
      request: { url: "http://h/v1/x", method: "GET" },
    });
    expect(options.beforeSendTransaction({ transaction: `GET /v1/x?${SECRET}` })).toEqual({
      transaction: "GET /v1/x",
    });
    expect(options.beforeSendSpan({ attributes: { "user_agent.original": "UA" } })).toEqual({
      attributes: {},
    });
  });
});
