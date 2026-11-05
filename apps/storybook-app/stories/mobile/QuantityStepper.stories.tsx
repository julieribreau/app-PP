import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import * as React from "react";
import { StyleSheet, View } from "react-native";

import { QuantityStepper } from "@/components/ui/QuantityStepper";

// Quantité : fiche produit (44 pt) et panier (corbeille à 1).
function Steppers() {
  const [a, setA] = React.useState(2);
  const [b, setB] = React.useState(1);
  return (
    <View style={styles.stack}>
      <QuantityStepper value={a} max={3} onChange={setA} />
      <QuantityStepper
        size="sm"
        value={b}
        max={42}
        onChange={setB}
        onRemove={() => setB(1)}
        itemName="Avoine & cacao"
      />
      <QuantityStepper value={1} max={1} onChange={() => undefined} disabled />
    </View>
  );
}

const meta = { title: "Mobile/Molecules/QuantityStepper", component: Steppers } satisfies Meta<
  typeof Steppers
>;
export default meta;
export const Etats: StoryObj<typeof meta> = {};

const styles = StyleSheet.create({ stack: { gap: 16, alignItems: "flex-start" } });
