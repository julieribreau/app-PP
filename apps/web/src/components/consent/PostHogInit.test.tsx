import { ConsentProvider, memoryStore, useConsentContext } from "@nutrion/cmp";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Le SDK est doublé : on vérifie ce que l'app lui demande, jamais le réseau (Playwright le fait).
const posthog = vi.hoisted(() => ({
  init: vi.fn(),
  register: vi.fn(),
  opt_in_capturing: vi.fn(),
  opt_out_capturing: vi.fn(),
  reset: vi.fn(),
}));
vi.mock("posthog-js", () => ({ default: posthog }));

import { PostHogInit } from "./PostHogInit";

function Choix() {
  const { acceptAll, rejectAll, ready } = useConsentContext();
  if (!ready) return null;
  return (
    <>
      <button type="button" onClick={acceptAll}>
        accepter
      </button>
      <button type="button" onClick={rejectAll}>
        refuser
      </button>
    </>
  );
}

function afficher(store = memoryStore()) {
  render(
    <ConsentProvider store={store}>
      <PostHogInit settings={{ key: "phc_test", host: undefined }} />
      <Choix />
    </ConsentProvider>,
  );
  return store;
}

describe("PostHogInit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "preprod");
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it("ne charge ni n'initialise PostHog avant le consentement", async () => {
    afficher();
    await screen.findByRole("button", { name: "accepter" });
    expect(posthog.init).not.toHaveBeenCalled();
    expect(posthog.opt_in_capturing).not.toHaveBeenCalled();
  });

  it("au oui : instance UE, APP_ENV en propriété, puis la mesure démarre", async () => {
    afficher();
    fireEvent.click(await screen.findByRole("button", { name: "accepter" }));

    await waitFor(() => expect(posthog.opt_in_capturing).toHaveBeenCalled());
    expect(posthog.init).toHaveBeenCalledOnce();
    const [key, options] = posthog.init.mock.calls[0] ?? [];
    expect(key).toBe("phc_test");
    expect(options).toMatchObject({
      api_host: "https://eu.i.posthog.com",
      opt_out_capturing_by_default: true,
      // L'opt-out efface alors le stockage du SDK : vérifié en vrai navigateur (e2e/consent.spec.ts).
      opt_out_persistence_by_default: true,
      autocapture: true,
      capture_pageview: "history_change",
      capture_pageleave: true,
      disable_session_recording: true,
    });
    expect(posthog.register).toHaveBeenCalledWith({ app_env: "preprod", platform: "web" });
    // Les propriétés avant l'opt-in : la page vue qu'il envoie les porte déjà.
    expect(posthog.register.mock.invocationCallOrder[0]).toBeLessThan(
      posthog.opt_in_capturing.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it("au retrait : opt-out, sans reset (il relancerait une requête vers PostHog)", async () => {
    afficher();
    fireEvent.click(await screen.findByRole("button", { name: "accepter" }));
    await waitFor(() => expect(posthog.opt_in_capturing).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "refuser" }));
    await waitFor(() => expect(posthog.opt_out_capturing).toHaveBeenCalled());
    expect(posthog.reset).not.toHaveBeenCalled();
  });
});
