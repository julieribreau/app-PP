import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "@/components/ui/button";

// Bouton de l'app web (piste B) : pilule, 44 px, une seule action primaire par vue.
const meta = {
  title: "Atoms/AppButton",
  component: Button,
  tags: ["autodocs"],
  args: { children: "Ajouter au panier" },
} satisfies Meta<typeof Button>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = { args: { variant: "primary" } };
export const Secondary: Story = { args: { variant: "secondary", children: "Voir les saveurs" } };
export const Outline: Story = { args: { variant: "outline", children: "Annuler" } };
export const Destructive: Story = { args: { variant: "destructive", children: "Supprimer mon compte" } };
export const Disabled: Story = { args: { disabled: true, children: "Paiement bientôt disponible" } };
