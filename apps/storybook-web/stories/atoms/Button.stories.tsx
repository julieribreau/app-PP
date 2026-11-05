import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, type ButtonProps } from "@nutrion/ui";
import { useTranslations } from "next-intl";

// Le libellé vient du dictionnaire : la story change de langue avec la barre d'outils.
function TranslatedButton({
  labelKey,
  ...props
}: Omit<ButtonProps, "label"> & { labelKey: string }) {
  const t = useTranslations();
  return <Button {...props} label={t(labelKey)} />;
}

const meta = {
  title: "Atoms/Button",
  component: TranslatedButton,
  tags: ["autodocs"],
  args: { labelKey: "consent.manager.save" },
} satisfies Meta<typeof TranslatedButton>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = { args: { variant: "primary" } };
export const Secondary: Story = { args: { variant: "secondary" } };
export const Disabled: Story = { args: { disabled: true } };
// Contenu long : le libellé passe à la ligne sans déborder du bouton.
export const LongLabel: Story = { args: { labelKey: "consent.banner.body" } };
