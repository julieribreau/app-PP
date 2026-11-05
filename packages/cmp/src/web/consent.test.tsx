// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import en from "@nutrion/i18n/messages/en.json";
import fr from "@nutrion/i18n/messages/fr.json";

import { ConsentProvider, useConsent } from "../ConsentProvider";
import type { ConsentCopy } from "../copy";
import { memoryStore, type KeyValueStore } from "../storage";
import { DEFAULT_CONSENT_CONFIG as config, type ConsentRecord } from "../types";
import { ConsentBanner } from "./ConsentBanner";
import { ConsentManager } from "./ConsentManager";
import { ConsentSettingsLink } from "./ConsentSettingsLink";

// Les dictionnaires de l'app ont la forme attendue : une clé manquante ne compile pas.
const copies = { fr: fr.consent, en: en.consent } satisfies Record<string, ConsentCopy>;
const now = () => new Date("2026-10-05T10:00:00.000Z");

function Analytics() {
  return <output aria-label="mesure">{useConsent("analytics") ? "oui" : "non"}</output>;
}

async function afficher(store: KeyValueStore = memoryStore(), onChange = vi.fn()) {
  const copy = copies.fr;
  render(
    <ConsentProvider config={config} store={store} now={now} onChange={onChange}>
      <ConsentBanner copy={copy} policyHref="/fr/cookies" />
      <ConsentManager copy={copy} locale="fr" />
      <ConsentSettingsLink label={copy.settingsLink} />
      <Analytics />
    </ConsentProvider>,
  );
  await screen.findByLabelText("mesure");
  return { store, onChange };
}

const stored = async (store: KeyValueStore) =>
  JSON.parse(String(await store.getItem("consent"))) as ConsentRecord;

afterEach(cleanup);

describe("bandeau", () => {
  it("s'affiche au premier passage, annoncé par son titre, et prend le focus", async () => {
    await afficher();
    const banner = await screen.findByRole("dialog", { name: fr.consent.banner.title });
    expect(banner.getAttribute("aria-modal")).toBe("false");
    expect(document.activeElement).toBe(banner);
    expect(screen.getByRole("link", { name: fr.consent.banner.policy }).getAttribute("href")).toBe(
      "/fr/cookies",
    );
  });

  it("« Refuser » et « Accepter » ont la même forme", async () => {
    await afficher();
    const reject = await screen.findByRole("button", { name: fr.consent.banner.reject });
    const accept = screen.getByRole("button", { name: fr.consent.banner.accept });
    expect(reject.className).toBe(accept.className);
  });

  it("« Accepter » ouvre la mesure, stocke la preuve et s'efface", async () => {
    const { store, onChange } = await afficher();
    fireEvent.click(await screen.findByRole("button", { name: fr.consent.banner.accept }));

    expect(screen.getByLabelText("mesure").textContent).toBe("oui");
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(onChange).toHaveBeenCalledOnce());
    expect(await stored(store)).toMatchObject({
      version: config.version,
      decidedAt: now().toISOString(),
      choices: { analytics: true },
    });
  });

  it("« Refuser » ferme la mesure et ne revient pas au passage suivant", async () => {
    const { store } = await afficher();
    fireEvent.click(await screen.findByRole("button", { name: fr.consent.banner.reject }));
    expect(screen.getByLabelText("mesure").textContent).toBe("non");
    await waitFor(async () => expect((await stored(store)).choices).toEqual({ analytics: false }));

    cleanup();
    await afficher(store);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("gestionnaire", () => {
  it("« Gérer mes cookies » le rouvre et permet de retirer son accord", async () => {
    const { store } = await afficher();
    fireEvent.click(await screen.findByRole("button", { name: fr.consent.banner.accept }));

    const link = screen.getByRole("button", { name: fr.consent.settingsLink });
    link.focus();
    fireEvent.click(link);
    const manager = screen.getByRole("dialog", { name: fr.consent.manager.title });
    expect(manager.textContent).toContain("Choix enregistré le 5 octobre 2026");

    const box = screen.getByRole("checkbox", { name: fr.consent.purposes.analytics.label });
    expect((box as HTMLInputElement).checked).toBe(true);
    fireEvent.click(box);
    fireEvent.click(screen.getByRole("button", { name: fr.consent.manager.save }));

    expect(screen.getByLabelText("mesure").textContent).toBe("non");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(link);
    await waitFor(async () => expect((await stored(store)).choices).toEqual({ analytics: false }));
  });

  it("le strictement nécessaire n'a pas de case : il est toujours actif", async () => {
    await afficher();
    fireEvent.click(await screen.findByRole("button", { name: fr.consent.banner.customize }));
    expect(screen.getAllByRole("checkbox")).toHaveLength(1);
    expect(screen.getByText(fr.consent.purposes.essential.label)).toBeTruthy();
    expect(screen.getByText(fr.consent.manager.required)).toBeTruthy();
  });

  it("Échap sans avoir choisi vaut refus, et le bandeau ne revient pas", async () => {
    const { store } = await afficher();
    fireEvent.click(await screen.findByRole("button", { name: fr.consent.banner.customize }));
    const manager = screen.getByRole("dialog", { name: fr.consent.manager.title });
    act(() => {
      manager.dispatchEvent(new Event("cancel", { cancelable: true }));
    });

    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(async () => expect((await stored(store)).choices).toEqual({ analytics: false }));
  });
});
