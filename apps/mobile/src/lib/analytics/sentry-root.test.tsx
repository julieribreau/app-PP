import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as Sentry from "@sentry/react-native";

import { sentryRoot } from "./sentry-root";

jest.mock("@sentry/react-native", () => ({ wrap: jest.fn(() => function Wrapped() {}) }));

function Root() {
  return null;
}

describe("sentryRoot", () => {
  beforeEach(() => {
    jest.mocked(Sentry.wrap).mockClear();
  });

  it("laisse la racine telle quelle sans DSN : pas d'avertissement « wrap avant init »", () => {
    expect(sentryRoot(undefined, Root)).toBe(Root);
    expect(Sentry.wrap).not.toHaveBeenCalled();
  });

  it("enveloppe la racine quand Sentry est initialisé", () => {
    expect(sentryRoot("https://cle@sentry.example/1", Root)).not.toBe(Root);
    expect(jest.mocked(Sentry.wrap).mock.calls[0]?.[0]).toBe(Root);
  });
});
