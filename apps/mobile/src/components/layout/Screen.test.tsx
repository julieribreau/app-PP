import { describe, expect, it } from "@jest/globals";
import { screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { renderWithProviders } from "@/test/render";

import { Screen } from "./Screen";

describe("Screen", () => {
  it("laisse refermer le clavier en faisant défiler, et ajuste la zone au clavier", async () => {
    await renderWithProviders(
      <Screen>
        <Text>contenu</Text>
      </Screen>,
    );
    const scroll = screen.getByTestId("screen-scroll");
    expect(scroll.props.keyboardDismissMode).toMatch(/interactive|on-drag/);
    expect(scroll.props.automaticallyAdjustKeyboardInsets).toBe(true);
  });
});
