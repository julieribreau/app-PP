import { describe, expect, it, jest } from "@jest/globals";
import { act } from "@testing-library/react-native";

import { queryKeys } from "@/lib/api/query";
import { usePrefsStore } from "@/stores/prefs.store";
import type * as mockApi from "@/test/api-mock";
import { renderWithProviders } from "@/test/render";

import { useCart, useCartFollowsLocale } from "./useCart";

jest.mock(
  "@/lib/api/client",
  () => jest.requireActual<typeof mockApi>("@/test/api-mock").apiModule,
);

function Probe() {
  useCartFollowsLocale();
  useCart();
  return null;
}

describe("panier et langue", () => {
  it("relit le panier quand la langue change, pas au premier rendu", async () => {
    usePrefsStore.setState({ locale: "en" });
    const { client } = await renderWithProviders(<Probe />);
    const invalidate = jest.spyOn(client, "invalidateQueries");
    expect(invalidate).not.toHaveBeenCalled();
    await act(async () => usePrefsStore.setState({ locale: "fr" }));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.cart });
  });
});
