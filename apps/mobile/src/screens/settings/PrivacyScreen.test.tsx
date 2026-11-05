import { describe, expect, it } from "@jest/globals";
import {
  ConsentProvider,
  createRecord,
  DEFAULT_CONSENT_CONFIG as config,
  memoryStore,
  type ConsentRecord,
  type KeyValueStore,
} from "@nutrion/cmp";
import en from "@nutrion/i18n/messages/en.json";
import fr from "@nutrion/i18n/messages/fr.json";
import { fireEvent, render, screen, userEvent, waitFor } from "@testing-library/react-native";

import { PrivacyScreen } from "./PrivacyScreen";

const accepte = createRecord(config, { analytics: true }, new Date("2026-10-05T10:00:00Z"), null);
const t = Intl.DateTimeFormat().resolvedOptions().locale.startsWith("en") ? en : fr;

async function afficher(store: KeyValueStore) {
  await render(
    <ConsentProvider config={config} store={store}>
      <PrivacyScreen />
    </ConsentProvider>,
  );
}

const stored = async (store: KeyValueStore) =>
  JSON.parse(String(await store.getItem(config.storageKey))) as ConsentRecord;

describe("PrivacyScreen", () => {
  it("montre le choix en vigueur, finalité par finalité", async () => {
    await afficher(memoryStore({ [config.storageKey]: JSON.stringify(accepte) }));
    const analytics = await screen.findByLabelText(t.consent.purposes.analytics.label);
    await waitFor(() => expect(analytics.props.value).toBe(true));
    expect(screen.getByText(t.consent.manager.required)).toBeTruthy();
  });

  it("retirer son accord est aussi simple que le donner, et la preuve suit", async () => {
    const store = memoryStore({ [config.storageKey]: JSON.stringify(accepte) });
    await afficher(store);
    const analytics = await screen.findByLabelText(t.consent.purposes.analytics.label);
    await waitFor(() => expect(analytics.props.value).toBe(true));

    await fireEvent(analytics, "valueChange", false);
    await userEvent.press(screen.getByRole("button", { name: t.consent.manager.save }));

    await waitFor(async () => expect((await stored(store)).choices).toEqual({ analytics: false }));
    const record = await stored(store);
    expect(record.version).toBe(config.version);
    expect(record.choiceDates.analytics).not.toBe(accepte.choiceDates.analytics);
  });

  it("« Tout accepter » depuis l'écran, sans choix préalable", async () => {
    const store = memoryStore();
    await afficher(store);
    await userEvent.press(await screen.findByRole("button", { name: t.consent.manager.acceptAll }));
    await waitFor(async () => expect((await stored(store)).choices).toEqual({ analytics: true }));
  });
});
