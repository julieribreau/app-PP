import { cleanup, screen } from "@testing-library/react";
import fr from "@nutrion/i18n/messages/fr.json";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderIntl } from "@/test-utils";

import { ProductCard } from "./ProductCard";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const base = {
  id: "p1",
  slug: "avoine-cacao",
  name: "Avoine & cacao",
  summary: "",
  category: { slug: "barres-cereales", name: "Barres céréales" },
  imageUrl: null,
  priceFromCents: 290,
  priceVaries: true,
  variantSummary: "2 saveurs",
  available: true,
};

describe("ProductCard", () => {
  afterEach(cleanup);

  it("mène à la fiche et affiche « dès » quand le prix varie, sans badge de stock", () => {
    renderIntl(<ProductCard product={base} />);
    expect(screen.getByRole("link").getAttribute("href")).toBe("/boutique/avoine-cacao");
    expect(screen.getByText(/dès 2,90/)).toBeTruthy();
    expect(screen.queryByText(fr.common.outOfStock)).toBeNull();
  });

  it("signale seulement la rupture", () => {
    renderIntl(<ProductCard product={{ ...base, available: false, priceVaries: false }} />);
    expect(screen.getByText(fr.common.outOfStock)).toBeTruthy();
  });
});
