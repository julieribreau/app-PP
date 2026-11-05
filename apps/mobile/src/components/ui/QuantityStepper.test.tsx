import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { QuantityStepper } from "./QuantityStepper";

describe("QuantityStepper", () => {
  it("borne la quantité entre 1 et le maximum", async () => {
    const onChange = jest.fn();
    await render(<QuantityStepper value={3} max={3} onChange={onChange} />);
    expect(screen.getByLabelText("Ajouter un")).toBeDisabled();
    await fireEvent.press(screen.getByLabelText("Retirer un"));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it("désactive le « − » à 1, sans action de retrait", async () => {
    await render(<QuantityStepper value={1} max={5} onChange={jest.fn()} />);
    expect(screen.getByLabelText("Retirer un")).toBeDisabled();
  });

  it("dans le panier, le « − » à 1 retire l'article", async () => {
    const onRemove = jest.fn();
    await render(
      <QuantityStepper
        value={1}
        max={5}
        onChange={jest.fn()}
        onRemove={onRemove}
        itemName="Avoine & cacao"
      />,
    );
    await fireEvent.press(screen.getByLabelText("Retirer Avoine & cacao du panier"));
    expect(onRemove).toHaveBeenCalled();
    expect(screen.getByLabelText("Quantité de Avoine & cacao")).toBeTruthy();
  });
});
