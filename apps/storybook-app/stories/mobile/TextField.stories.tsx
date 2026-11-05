import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { StyleSheet, View } from "react-native";

import { TextField } from "@/components/ui/TextField";

import { useStoryMessages } from "../../.storybook/context";

// Champ (Input) : libellé visible, bord `input`, aide ou erreur reliée.
function Fields() {
  const { auth } = useStoryMessages();
  return (
    <View style={styles.stack}>
      <TextField
        label={auth.email}
        defaultValue="camille.martin@exemple.fr"
        help={auth.emailHelp}
      />
      <TextField
        label={auth.password}
        secureTextEntry
        defaultValue="abc"
        error={auth.passwordHelp}
      />
      <TextField label={auth.firstName} placeholder={auth.firstName} />
    </View>
  );
}

const meta = { title: "Mobile/Atoms/Input", component: Fields } satisfies Meta<typeof Fields>;
export default meta;
export const Etats: StoryObj<typeof meta> = {};

const styles = StyleSheet.create({ stack: { gap: 16 } });
