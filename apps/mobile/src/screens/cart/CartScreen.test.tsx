import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { apiMock } from "@/test/api-mock";
import type * as mockApi from "@/test/api-mock";
import { renderWithProviders } from "@/test/render";
import { EMPTY_CART, type Cart } from "@/types/api";

import { CartScreen } from "./CartScreen";

jest.mock(
  "@/lib/api/client",
  () => jest.requireActual<typeof mockApi>("@/test/api-mock").apiModule,
);
jest.mock("expo-router", () => ({
  router: jest.requireActual<typeof mockApi>("@/test/api-mock").routerMock,
}));
jest.mock("@/hooks/auth/useSession", () => ({
  useSession: () => ({ data: null, isPending: false }),
}));

const cart: Cart = {
  ...EMPTY_CART,
  id: "c1",
  items: [
    {
      id: "i1",
      variantId: "v1",
      productSlug: "avoine-cacao",
      productName: "Avoine & cacao",
      variantLabel: "Cacao · À l'unité",
      imageUrl: null,
      unitPriceCents: 290,
      quantity: 1,
      lineTotalCents: 290,
      maxQuantity: 42,
    },
  ],
  itemCount: 1,
  subtotalCents: 290,
  vatCents: 15,
  totalCents: 290,
};

describe("panier", () => {
  beforeEach(() => {
    apiMock.get.mockReset();
    apiMock.delete.mockReset();
  });

  it("montre les lignes, le total et un paiement désactivé", async () => {
    apiMock.get.mockResolvedValue(cart);
    await renderWithProviders(<CartScreen />);
    expect(await screen.findByText("Avoine & cacao")).toBeTruthy();
    expect(screen.getAllByText(/^2,90\s€$/).length).toBeGreaterThan(0);
    expect(screen.getByTestId("checkout")).toBeDisabled();
    expect(screen.getByText("Paiement bientôt disponible")).toBeTruthy();
    expect(screen.getByText(/Panier gardé sur ce téléphone/)).toBeTruthy();
  });

  it("retire l'article par la corbeille du sélecteur", async () => {
    apiMock.get.mockResolvedValue(cart);
    apiMock.delete.mockResolvedValue(EMPTY_CART);
    await renderWithProviders(<CartScreen />);
    await fireEvent.press(await screen.findByLabelText("Retirer Avoine & cacao du panier"));
    await waitFor(() => expect(apiMock.delete).toHaveBeenCalledWith("/cart/items/i1"));
    expect(await screen.findByText("Votre panier est vide.")).toBeTruthy();
  });

  it("signale un panier mis à jour", async () => {
    apiMock.get.mockResolvedValue({
      ...cart,
      adjustments: [{ variantId: "v1", kind: "quantity_capped" }],
    });
    await renderWithProviders(<CartScreen />);
    expect(await screen.findByText(/Votre panier a été mis à jour/)).toBeTruthy();
  });
});
