import type { Meta, StoryObj } from "@storybook/react-vite";
import { useTranslations } from "next-intl";

import { ExampleCard } from "@/components/example/ExampleCard";

function TranslatedCard({ repeat = 1 }: { repeat?: number }) {
  const t = useTranslations("home.card");
  return (
    <ExampleCard
      title={t("title")}
      description={Array.from({ length: repeat }, () => t("description")).join(" ")}
    />
  );
}

const meta = {
  title: "Molecules/ExampleCard",
  component: TranslatedCard,
  tags: ["autodocs"],
} satisfies Meta<typeof TranslatedCard>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
// Contenu long : le texte passe à la ligne dans la carte, sans la déborder.
export const LongContent: Story = { args: { repeat: 8 } };
