// Le réglage `dataCollection` tel que le SDK le résout, pas tel qu'on l'écrit.
//
// POURQUOI CE TEST EXISTE. En 11, toute catégorie absente de `dataCollection`
// prend le défaut du SDK, qui collecte. Une mineure qui ajoute une catégorie
// l'ajouterait donc allumée, sans rien casser ni au typecheck ni à l'exécution.
// Ce test lit la configuration RÉSOLUE par le client : toute clé inconnue le
// fait tomber, et il faut alors décider de sa valeur en connaissance de cause.
import * as Sentry from "@sentry/node";
import { afterAll, describe, expect, it } from "vitest";

import { SANS_DONNEES_PERSONNELLES } from "./data-collection";

describe("SANS_DONNEES_PERSONNELLES, résolu par le SDK", () => {
  // Sans DSN, le client existe mais n'envoie rien.
  Sentry.init({ dataCollection: SANS_DONNEES_PERSONNELLES });
  const resolu = Sentry.getClient()?.getDataCollectionOptions();

  afterAll(async () => {
    await Sentry.close();
  });

  it("le client a résolu une configuration", () => {
    expect(resolu).toBeDefined();
  });

  it("ne connaît que les catégories passées en revue", () => {
    expect(Object.keys(resolu ?? {}).sort()).toEqual(
      [
        "cookies",
        "databaseQueryData",
        "frameContextLines",
        "genAI",
        "graphQL",
        "httpBodies",
        "httpHeaders",
        "mcp",
        "queues",
        "stackFrameVariables",
        "urlQueryParams",
        "userInfo",
      ].sort(),
    );
  });

  it("ne collecte ni utilisateur, ni cookies, ni en-têtes, ni corps", () => {
    expect(resolu).toMatchObject({
      userInfo: false,
      cookies: false,
      httpHeaders: { request: false, response: false },
      httpBodies: [],
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
      mcp: { inputs: false, outputs: false },
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
    });
  });

  it("filtre les clés d'adresse IP des paramètres d'URL", () => {
    expect(resolu?.urlQueryParams).toEqual({
      deny: ["forwarded", "-ip", "remote-", "via", "-user"],
    });
  });
});
