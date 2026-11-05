import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { StyleSheet, View } from "react-native";

import { Button } from "@/components/ui/Button";

import { useStoryMessages } from "../../.storybook/context";

// Bouton de l'app mobile (piste B) : pilule, primaire une fois par écran, désactivé sur `muted`.
function Buttons() {
  const { product, cart, common, auth } = useStoryMessages();
  return (
    <View style={styles.stack}>
      <Button label={product.addToCart} />
      <Button label={auth.signIn} variant="outline" />
      <Button label={common.retry} variant="secondary" />
      <Button label={common.delete} variant="destructive" />
      <Button label={cart.checkout} disabled />
      <Button label={auth.biometric.replace("{method}", auth.faceId)} icon="scanFace" size="lg" />
      <Button label={product.addToCart} loading />
    </View>
  );
}

const meta = { title: "Mobile/Atoms/Button", component: Buttons } satisfies Meta<typeof Buttons>;
export default meta;
export const Variantes: StoryObj<typeof meta> = {};

const styles = StyleSheet.create({ stack: { gap: 12 } });
