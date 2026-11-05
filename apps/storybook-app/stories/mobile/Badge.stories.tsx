import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { StyleSheet, View } from "react-native";

import { Badge } from "@/components/ui/Badge";

import { useStoryMessages } from "../../.storybook/context";

// Badges : côté boutique, seul « Rupture » (ADR-002) ; « Par défaut » sert les adresses.
function Badges() {
  const { common, account } = useStoryMessages();
  return (
    <View style={styles.row}>
      <Badge label={common.outOfStock} />
      <Badge label={account.address.default} tone="success" />
    </View>
  );
}

const meta = { title: "Mobile/Atoms/Badge", component: Badges } satisfies Meta<typeof Badges>;
export default meta;
export const Tons: StoryObj<typeof meta> = {};

const styles = StyleSheet.create({ row: { flexDirection: "row", gap: 8 } });
