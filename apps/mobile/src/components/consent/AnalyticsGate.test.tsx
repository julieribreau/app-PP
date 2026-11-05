import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { ConsentProvider, memoryStore, useConsentContext } from "@nutrion/cmp";
import { ConsentBanner } from "@nutrion/cmp/native";
import fr from "@nutrion/i18n/messages/fr.json";
import { render, screen, userEvent } from "@testing-library/react-native";
import { Pressable, Text } from "react-native";

// Le SDK est doublé : on vérifie quand l'app crée le client et ce qu'elle lui demande.
const mockClient = {
  optIn: jest.fn(() => Promise.resolve()),
  optOut: jest.fn(() => Promise.resolve()),
  reset: jest.fn(),
  setPersistedProperty: jest.fn(),
  register: jest.fn((..._args: unknown[]) => Promise.resolve()),
  screen: jest.fn((..._args: unknown[]) => Promise.resolve()),
};
const mockPostHog = jest.fn((..._args: unknown[]) => mockClient);
jest.mock("posthog-react-native", () => ({
  __esModule: true,
  default: function PostHog(...args: unknown[]) {
    return mockPostHog(...args);
  },
  PostHogProvider: ({ children }: { children: React.ReactNode }) => children,
  PostHogPersistedProperty: { Queue: "queue" },
}));
jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn() },
}));
jest.mock("expo-router", () => ({ usePathname: () => "/" }));

import { AnalyticsGate } from "./AnalyticsGate";

function Retrait() {
  const { rejectAll } = useConsentContext();
  return (
    <Pressable accessibilityRole="button" onPress={rejectAll}>
      <Text>retirer</Text>
    </Pressable>
  );
}

async function afficher() {
  await render(
    <ConsentProvider store={memoryStore()}>
      <AnalyticsGate settings={{ key: "phc_test" }}>
        <Text>accueil</Text>
        <Retrait />
      </AnalyticsGate>
      <ConsentBanner copy={fr.consent} onCustomize={jest.fn()} />
    </ConsentProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.EXPO_PUBLIC_APP_ENV = "preprod";
});

describe("AnalyticsGate", () => {
  it("aucun client PostHog tant que l'usager n'a pas répondu", async () => {
    await afficher();
    expect(await screen.findByText(fr.consent.banner.title)).toBeTruthy();
    expect(mockPostHog).not.toHaveBeenCalled();
  });

  it("« Refuser » et « Accepter » ont le même style sur la feuille", async () => {
    await afficher();
    const reject = await screen.findByRole("button", { name: fr.consent.banner.reject });
    const accept = screen.getByRole("button", { name: fr.consent.banner.accept });
    expect(reject.props.style).toEqual(accept.props.style);
  });

  it("au oui : client sur l'instance UE, APP_ENV en propriété, écran courant mesuré", async () => {
    await afficher();
    await userEvent.press(await screen.findByRole("button", { name: fr.consent.banner.accept }));

    expect(mockPostHog).toHaveBeenCalledTimes(1);
    expect(mockPostHog).toHaveBeenCalledWith(
      "phc_test",
      expect.objectContaining({
        host: "https://eu.i.posthog.com",
        disableRemoteFeatureFlags: true,
      }),
    );
    expect(mockClient.optIn).toHaveBeenCalled();
    expect(mockClient.register).toHaveBeenCalledWith({ app_env: "preprod", platform: "mobile" });
    expect(mockClient.screen).toHaveBeenCalledWith("/");
    expect(screen.queryByText(fr.consent.banner.title)).toBeNull();
  });

  it("au retrait : purge locale (file d'attente comprise) puis opt-out", async () => {
    await afficher();
    await userEvent.press(await screen.findByRole("button", { name: fr.consent.banner.accept }));
    await userEvent.press(await screen.findByRole("button", { name: "retirer" }));

    expect(mockClient.reset).toHaveBeenCalled();
    expect(mockClient.setPersistedProperty).toHaveBeenCalledWith("queue", null);
    expect(mockClient.optOut).toHaveBeenCalled();
    expect(mockClient.reset.mock.invocationCallOrder[0]).toBeLessThan(
      mockClient.optOut.mock.invocationCallOrder[0] ?? 0,
    );
  });
});
