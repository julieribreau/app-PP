import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { Button, type ButtonProps } from "@nutrion/ui";

import { useStoryMessages } from "../../.storybook/context";

type Key = "save" | "body";

// Le libellé vient du dictionnaire : la story change de langue avec la barre d'outils.
function TranslatedButton({ labelKey, ...props }: Omit<ButtonProps, "label"> & { labelKey: Key }) {
  const { consent } = useStoryMessages();
  const label = labelKey === "save" ? consent.manager.save : consent.banner.body;
  return <Button {...props} label={label} />;
}

const meta = {
  title: "Atoms/Button",
  component: TranslatedButton,
  tags: ["autodocs"],
  args: { labelKey: "save" },
} satisfies Meta<typeof TranslatedButton>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = { args: { variant: "primary" } };
export const Secondary: Story = { args: { variant: "secondary" } };
export const Disabled: Story = { args: { disabled: true } };
// Contenu long : le libellé passe à la ligne sans déborder du bouton.
export const LongLabel: Story = { args: { labelKey: "body" } };
