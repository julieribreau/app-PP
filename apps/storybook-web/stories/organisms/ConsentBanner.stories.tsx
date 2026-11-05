import type { Meta, StoryObj } from "@storybook/react-vite";
import { ConsentProvider, memoryStore, type ConsentCopy } from "@nutrion/cmp";
import { ConsentBanner } from "@nutrion/cmp/web";
import { useMessages } from "next-intl";
import * as React from "react";

// Premier passage : aucun choix stocké, le bandeau s'affiche. Stockage en mémoire, propre à
// la story : rien n'est écrit dans le navigateur.
function FirstVisit({ policyHref }: { policyHref?: string }) {
  const { consent } = useMessages() as unknown as { consent: ConsentCopy };
  const store = React.useMemo(() => memoryStore(), []);
  return (
    <ConsentProvider store={store}>
      <ConsentBanner copy={consent} policyHref={policyHref} />
    </ConsentProvider>
  );
}

const meta = {
  title: "Organisms/ConsentBanner",
  component: FirstVisit,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof FirstVisit>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
// Politique cookies publiée : le lien suit le texte.
export const WithPolicyLink: Story = { args: { policyHref: "#politique-cookies" } };
