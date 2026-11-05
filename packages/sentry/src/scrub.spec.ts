import { describe, expect, it } from "vitest";

import { scrubEvent } from "./scrub";

describe("scrubEvent", () => {
  it("retire une adresse électronique d'un message d'exception", () => {
    const event = {
      exception: { values: [{ value: "Utilisateur jean.dupont+test@exemple.fr introuvable" }] },
    };
    expect(scrubEvent(event).exception.values[0]?.value).toBe("Utilisateur [retiré] introuvable");
  });

  it("retire le chemin d'une pièce justificative, en gardant le préfixe diagnosticable", () => {
    // LE cas qui compte : le DPA Sentry interdit les données de l'article 9,
    // et le nom du fichier suffit à révéler la nature de la pièce.
    const event = {
      message:
        "ENOENT: uploads/justificatifs/8f2a/attestation-handicap-9d4e.jpg introuvable sur le disque",
    };
    expect(scrubEvent(event).message).toBe("ENOENT: uploads/[retiré] introuvable sur le disque");
  });

  it("retire un numéro de téléphone français, quel que soit le séparateur", () => {
    for (const tel of ["06 12 34 56 78", "06.12.34.56.78", "0612345678", "+33 6 12 34 56 78"]) {
      expect(scrubEvent({ message: `SMS vers ${tel} rejeté` }).message).toBe(
        "SMS vers [retiré] rejeté",
      );
    }
  });

  it("descend dans les tableaux et les objets imbriqués", () => {
    const event = {
      breadcrumbs: [
        { message: "POST /v1/account with contact@exemple.fr" },
        { data: { nested: { deep: "uploads/justificatifs/x/piece.pdf" } } },
      ],
    };
    const out = scrubEvent(event);
    expect(out.breadcrumbs[0]?.message).toBe("POST /v1/account with [retiré]");
    expect(out.breadcrumbs[1]?.data?.nested?.deep).toBe("uploads/[retiré]");
  });

  it("ne modifie pas l'événement d'entrée", () => {
    const event = { message: "a@b.fr" };
    scrubEvent(event);
    expect(event.message).toBe("a@b.fr");
  });

  it("laisse passer ce qui n'est pas une donnée personnelle", () => {
    // Un retrait trop large rendrait les erreurs indiagnosticables : on vérifie
    // que la pile et les identifiants techniques survivent.
    const event = {
      message: "upstream_down after 3 retries",
      exception: {
        values: [
          {
            stacktrace: {
              frames: [{ filename: "/app/src/modules/export/services/export.service.ts" }],
            },
          },
        ],
      },
      tags: { app: "api", trace_id: "4bf92f3577b34da6a3ce929d0e0e4736" },
    };
    const out = scrubEvent(event);
    expect(out.message).toBe("upstream_down after 3 retries");
    expect(out.exception.values[0]?.stacktrace?.frames[0]?.filename).toBe(
      "/app/src/modules/export/services/export.service.ts",
    );
    expect(out.tags.trace_id).toBe("4bf92f3577b34da6a3ce929d0e0e4736");
  });

  it("applique le retrait deux fois de suite au même motif", () => {
    // Les expressions sont globales et partagées entre appels : sans remise à
    // zéro de `lastIndex`, un appel sur deux repart au milieu de la chaîne.
    const once = scrubEvent({ message: "a@b.fr" }).message;
    const twice = scrubEvent({ message: "a@b.fr" }).message;
    expect(once).toBe("[retiré]");
    expect(twice).toBe("[retiré]");
  });
});
