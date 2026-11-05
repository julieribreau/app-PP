import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { ConsentProvider, memoryStore } from "@nutrion/cmp";
import { ConsentBanner } from "@nutrion/cmp/native";
import * as React from "react";

import { useStoryMessages } from "../../.storybook/context";

// Premier lancement : aucun choix stocké, la feuille s'ancre en bas de l'écran. Stockage en
// mémoire, propre à la story.
function FirstLaunch({ bottomInset }: { bottomInset?: number }) {
  const { consent } = useStoryMessages();
  const store = React.useMemo(() => memoryStore(), []);
  return (
    <ConsentProvider store={store}>
      <ConsentBanner copy={consent} bottomInset={bottomInset} onCustomize={() => undefined} />
    </ConsentProvider>
  );
}

const meta = {
  title: "Organisms/ConsentBanner",
  component: FirstLaunch,
  tags: ["autodocs"],
} satisfies Meta<typeof FirstLaunch>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
// Téléphone à barre de geste : la marge de la zone sûre s'ajoute sous les boutons.
export const WithSafeArea: Story = { args: { bottomInset: 34 } };
