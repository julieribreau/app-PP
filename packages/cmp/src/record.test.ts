import { describe, expect, it } from "vitest";

import { allChoices, createRecord, expiresAt, isCurrent, isGranted } from "./record";
import { DEFAULT_CONSENT_CONFIG as config, type ConsentConfig } from "./types";

const now = new Date("2026-10-05T10:00:00.000Z");

describe("createRecord", () => {
  it("date le choix, porte la version et les finalités présentées", () => {
    const record = createRecord(config, { analytics: true }, now, null);
    expect(record).toEqual({
      version: "1",
      purposes: ["analytics"],
      choices: { analytics: true },
      decidedAt: now.toISOString(),
      choiceDates: { analytics: now.toISOString() },
    });
  });

  it("garde la date d'une réponse inchangée, renouvelle celle qui change", () => {
    const twoPurposes: ConsentConfig = {
      ...config,
      purposes: [...config.purposes, { id: "marketing" }],
    };
    const first = createRecord(twoPurposes, { analytics: true }, now, null);
    const later = new Date("2026-11-05T10:00:00.000Z");
    const second = createRecord(twoPurposes, { analytics: true, marketing: true }, later, first);
    expect(second.choiceDates).toEqual({
      analytics: now.toISOString(),
      marketing: later.toISOString(),
    });
  });

  it("une finalité non cochée vaut refus", () => {
    expect(createRecord(config, {}, now, null).choices).toEqual({ analytics: false });
  });
});

describe("isCurrent", () => {
  const record = createRecord(config, allChoices(config, true), now, null);

  it("vaut jusqu'à l'expiration, 13 mois après le choix", () => {
    expect(expiresAt(record, config).toISOString()).toBe("2027-11-05T10:00:00.000Z");
    expect(isCurrent(record, config, new Date("2027-11-05T09:59:59.000Z"))).toBe(true);
    expect(isCurrent(record, config, new Date("2027-11-05T10:00:00.000Z"))).toBe(false);
  });

  it("une nouvelle version de la politique redemande le choix", () => {
    expect(isCurrent(record, { ...config, version: "2" }, now)).toBe(false);
  });

  it("une finalité ajoutée ou retirée redemande le choix", () => {
    const added = { ...config, purposes: [...config.purposes, { id: "marketing" }] };
    expect(isCurrent(record, added, now)).toBe(false);
    const removed = { ...config, purposes: [{ id: "essential", required: true }] };
    expect(isCurrent(record, removed, now)).toBe(false);
  });
});

describe("isGranted", () => {
  it("rien d'accordé sans choix, sauf le strictement nécessaire", () => {
    expect(isGranted(null, config, "analytics")).toBe(false);
    expect(isGranted(null, config, "essential")).toBe(true);
  });

  it("suit la réponse de l'usager", () => {
    const yes = createRecord(config, { analytics: true }, now, null);
    const no = createRecord(config, { analytics: false }, now, yes);
    expect(isGranted(yes, config, "analytics")).toBe(true);
    expect(isGranted(no, config, "analytics")).toBe(false);
    expect(isGranted(yes, config, "inconnue")).toBe(false);
  });
});
