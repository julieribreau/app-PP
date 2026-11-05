import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import * as React from "react";

import { AccountScreen } from "@/screens/account/AccountScreen";
import { BiometricUnlockScreen } from "@/screens/auth/BiometricUnlockScreen";
import { CartScreen } from "@/screens/cart/CartScreen";
import { ProductView } from "@/screens/shop/ProductScreen";
import { ShopScreen } from "@/screens/shop/ShopScreen";
import { usePrefsStore } from "@/stores/prefs.store";

import { product } from "./fixtures";
import { ScreenFrame } from "./ScreenFrame";

// Écrans complets de l'app (canvas validé, ADR-002), sur données de démonstration.
const meta = {
  title: "Mobile/Screens",
  parameters: { fullScreen: true },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

export const Boutique: Story = {
  render: () => (
    <ScreenFrame>
      <ShopScreen />
    </ScreenFrame>
  ),
};
export const FicheProduit: Story = {
  render: () => (
    <ScreenFrame>
      <ProductView product={product} />
    </ScreenFrame>
  ),
};
export const Panier: Story = {
  render: () => (
    <ScreenFrame>
      <CartScreen />
    </ScreenFrame>
  ),
};
export const Compte: Story = {
  render: () => (
    <ScreenFrame signedIn>
      <AccountScreen />
    </ScreenFrame>
  ),
};
export const CompteDeconnecte: Story = {
  render: () => (
    <ScreenFrame>
      <AccountScreen />
    </ScreenFrame>
  ),
};

function Unlock() {
  React.useState(() =>
    usePrefsStore.setState({ lastFirstName: "Camille", lastEmail: "camille.martin@exemple.fr" }),
  );
  return (
    <ScreenFrame>
      <BiometricUnlockScreen />
    </ScreenFrame>
  );
}
export const ConnexionBiometrique: Story = { render: () => <Unlock /> };
