import { describe, expect, it, jest } from "@jest/globals";
import { act, waitFor } from "@testing-library/react-native";

import { queryKeys } from "@/lib/api/query";
import { apiMock } from "@/test/api-mock";
import { EMPTY_CART } from "@/types/api";
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

  it("garde la note de fusion du panier invité après la relecture", async () => {
    usePrefsStore.setState({ locale: "en" });
    apiMock.get.mockResolvedValue({ ...EMPTY_CART, itemCount: 5, merged: false });
    const { client } = await renderWithProviders(<Probe />);
    client.setQueryData(queryKeys.cart, { ...EMPTY_CART, itemCount: 5, merged: true });
    await act(async () => usePrefsStore.setState({ locale: "fr" }));
    await waitFor(() => expect(apiMock.get).toHaveBeenCalled());
    await waitFor(() =>
      expect(client.getQueryData<{ merged: boolean }>(queryKeys.cart)?.merged).toBe(true),
    );
  });
});
