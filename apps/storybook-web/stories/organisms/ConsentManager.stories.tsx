import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  ConsentProvider,
  createRecord,
  DEFAULT_CONSENT_CONFIG,
  memoryStore,
  useConsentContext,
  type ConsentCopy,
} from "@nutrion/cmp";
import { ConsentManager } from "@nutrion/cmp/web";
import { useLocale, useMessages } from "next-intl";
import * as React from "react";

// Horloge et choix figés : la date affichée ne change pas d'un passage à l'autre.
const NOW = new Date("2026-09-14T10:30:00Z");
const now = () => NOW;
const STORED = createRecord(DEFAULT_CONSENT_CONFIG, { analytics: true }, NOW, null);

// Le gestionnaire s'ouvre par « Personnaliser » ou « Gérer mes cookies » : la story l'ouvre
// une fois le stockage lu.
function OpenOnce() {
  const { ready, openManager } = useConsentContext();
  const opened = React.useRef(false);
  React.useEffect(() => {
    if (ready && !opened.current) {
      opened.current = true;
      openManager();
    }
  }, [ready, openManager]);
  return null;
}

function Manager({ stored }: { stored: boolean }) {
  const { consent } = useMessages() as unknown as { consent: ConsentCopy };
  const locale = useLocale();
  const store = React.useMemo(
    () =>
      memoryStore(stored ? { [DEFAULT_CONSENT_CONFIG.storageKey]: JSON.stringify(STORED) } : {}),
    [stored],
  );
  return (
    <ConsentProvider store={store} now={now}>
      <OpenOnce />
      <ConsentManager copy={consent} locale={locale} />
    </ConsentProvider>
  );
}

const meta = {
  title: "Organisms/ConsentManager",
  component: Manager,
  tags: ["autodocs"],
  args: { stored: false },
} satisfies Meta<typeof Manager>;
export default meta;

type Story = StoryObj<typeof meta>;

// Premier choix : aucune case cochée, aucune date.
export const FirstChoice: Story = {};
// Choix déjà fait : mesure d'audience acceptée, datée.
export const StoredChoice: Story = { args: { stored: true } };
