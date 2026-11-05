import { cleanup, fireEvent, screen } from "@testing-library/react";
import fr from "@nutrion/i18n/messages/fr.json";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderIntl } from "@/test-utils";

import { QuantityStepper } from "./QuantityStepper";

describe("QuantityStepper", () => {
  afterEach(cleanup);

  it("augmente et diminue dans les bornes", () => {
    const onChange = vi.fn();
    renderIntl(<QuantityStepper value={2} max={3} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: fr.product.increase }));
    expect(onChange).toHaveBeenLastCalledWith(3);
    fireEvent.click(screen.getByRole("button", { name: fr.product.decrease }));
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  it("désactive + au stock maximal et − au minimum", () => {
    renderIntl(<QuantityStepper value={3} max={3} onChange={() => {}} />);
    expect((screen.getByRole("button", { name: fr.product.increase }) as HTMLButtonElement).disabled).toBe(true);
    cleanup();
    renderIntl(<QuantityStepper value={1} max={3} onChange={() => {}} />);
    expect((screen.getByRole("button", { name: fr.product.decrease }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("porte un nom de groupe accessible et annonce la valeur", () => {
    renderIntl(<QuantityStepper value={4} onChange={() => {}} label="Quantité de Avoine & cacao" />);
    expect(screen.getByRole("group", { name: "Quantité de Avoine & cacao" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("4");
  });
});
