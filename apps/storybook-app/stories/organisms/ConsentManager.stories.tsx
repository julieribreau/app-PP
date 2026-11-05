import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { ConsentProvider, createRecord, DEFAULT_CONSENT_CONFIG, memoryStore } from "@nutrion/cmp";
import { ConsentManager } from "@nutrion/cmp/native";
import * as React from "react";

import { useStoryMessages } from "../../.storybook/context";

// Horloge et choix figés : la date affichée ne change pas d'un passage à l'autre.
const NOW = new Date("2026-09-14T10:30:00Z");
const now = () => NOW;
const STORED = createRecord(DEFAULT_CONSENT_CONFIG, { analytics: true }, NOW, null);

// L'écran Confidentialité de l'app, réduit au réglage des consentements.
function Manager({ stored, locale }: { stored: boolean; locale: string }) {
  const { consent } = useStoryMessages();
  const store = React.useMemo(
    () =>
      memoryStore(stored ? { [DEFAULT_CONSENT_CONFIG.storageKey]: JSON.stringify(STORED) } : {}),
    [stored],
  );
  return (
    <ConsentProvider store={store} now={now}>
      <ConsentManager copy={consent} locale={locale} />
    </ConsentProvider>
  );
}

const meta = {
  title: "Organisms/ConsentManager",
  component: Manager,
  tags: ["autodocs"],
  args: { stored: false, locale: "fr" },
  // La langue des dates suit celle de la barre d'outils.
  render: (args, { globals }) => <Manager {...args} locale={String(globals["locale"])} />,
} satisfies Meta<typeof Manager>;
export default meta;

type Story = StoryObj<typeof meta>;

// Premier choix : interrupteur éteint, aucune date.
export const FirstChoice: Story = {};
// Choix déjà fait : mesure d'audience acceptée, datée.
export const StoredChoice: Story = { args: { stored: true } };
