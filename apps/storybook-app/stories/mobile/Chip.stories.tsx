import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import * as React from "react";
import { StyleSheet, View } from "react-native";

import { Chip } from "@/components/ui/Chip";

import { useStoryMessages } from "../../.storybook/context";

// Puces : filtres de catégorie et choix d'option (saveur, format), une seule choisie.
function Chips() {
  const { shop } = useStoryMessages();
  const [picked, setPicked] = React.useState("all");
  const items = [
    { id: "all", label: shop.all },
    { id: "cereales", label: "Barres céréales" },
    { id: "proteinees", label: "Barres protéinées" },
    { id: "granolas", label: "Granolas" },
  ];
  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {items.map((item) => (
        <Chip key={item.id} role="radio" size="sm" label={item.label} selected={picked === item.id} onPress={() => setPicked(item.id)} />
      ))}
      <Chip label="Myrtille" disabled />
    </View>
  );
}

const meta = { title: "Mobile/Atoms/Chip", component: Chips } satisfies Meta<typeof Chips>;
export default meta;
export const Choix: StoryObj<typeof meta> = {};

const styles = StyleSheet.create({ row: { flexDirection: "row", flexWrap: "wrap", gap: 8 } });
