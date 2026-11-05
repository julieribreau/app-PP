import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { apiMock } from "@/test/api-mock";
import type * as mockApi from "@/test/api-mock";
import { renderWithProviders } from "@/test/render";
import { EMPTY_CART, type ProductDetail } from "@/types/api";

import { ProductView } from "./ProductScreen";

jest.mock(
  "@/lib/api/client",
  () => jest.requireActual<typeof mockApi>("@/test/api-mock").apiModule,
);
jest.mock("expo-router", () => ({
  router: jest.requireActual<typeof mockApi>("@/test/api-mock").routerMock,
}));

const variant = (
  [id, flavor, format]: [string, string, string],
  priceCents: number,
  stock: number | null,
) => ({
  id,
  optionValues: { saveur: flavor, format },
  label: `${flavor} · ${format}`,
  priceCents,
  stock,
  available: stock !== 0,
});

const product: ProductDetail = {
  id: "p1",
  slug: "avoine-cacao",
  name: "Avoine & cacao",
  summary: "Une barre moelleuse.",
  descriptionHtml: "<p>Flocons d'avoine complète.</p>",
  category: { slug: "barres-cereales", name: "Barres céréales" },
  imageUrl: null,
  priceCents: 290,
  vatRateBps: 550,
  options: [
    {
      id: "saveur",
      name: "Saveur",
      values: [
        { id: "Cacao", label: "Cacao" },
        { id: "Noisette", label: "Noisette" },
      ],
    },
    {
      id: "format",
      name: "Format",
      values: [
        { id: "Unite", label: "À l'unité" },
        { id: "Boite", label: "Boîte de 12" },
      ],
    },
  ],
  variants: [
    variant(["v1", "Cacao", "Unite"], 290, 42),
    variant(["v2", "Cacao", "Boite"], 2990, 3),
    variant(["v3", "Noisette", "Unite"], 290, 0),
  ],
};

const price = (euros: string) => screen.getAllByText(new RegExp(`^${euros}\\s€$`));

describe("fiche produit", () => {
  beforeEach(() => {
    apiMock.post.mockReset();
  });

  it("affiche le prix de la variante choisie et le met à jour", async () => {
    await renderWithProviders(<ProductView product={product} />);
    expect(price("2,90")).toBeTruthy();
    await fireEvent.press(screen.getByRole("radio", { name: "Boîte de 12" }));
    expect(price("29,90")).toBeTruthy();
    expect(screen.getByText("Format : Boîte de 12")).toBeTruthy();
  });

  it("n'affiche aucun badge de stock, sauf « Rupture »", async () => {
    await renderWithProviders(<ProductView product={product} />);
    expect(screen.queryByText("Rupture")).toBeNull();
    await fireEvent.press(screen.getByRole("radio", { name: "Noisette" }));
    expect(screen.getByText("Rupture")).toBeTruthy();
    expect(screen.getByTestId("add-to-cart")).toBeDisabled();
  });

  it("ajoute la variante et la quantité au panier", async () => {
    apiMock.post.mockResolvedValue({ ...EMPTY_CART, itemCount: 2 });
    await renderWithProviders(<ProductView product={product} />);
    await fireEvent.press(screen.getByLabelText("Ajouter un"));
    await fireEvent.press(screen.getByTestId("add-to-cart"));
    await waitFor(() =>
      expect(apiMock.post).toHaveBeenCalledWith("/cart/items", { variantId: "v1", quantity: 2 }),
    );
    expect(await screen.findByText("Voir le panier")).toBeTruthy();
  });
});
