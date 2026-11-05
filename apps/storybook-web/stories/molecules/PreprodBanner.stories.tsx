import type { Meta, StoryObj } from "@storybook/react-vite";

import { PreprodBanner } from "@/components/env/PreprodBanner";

const meta = {
  title: "Molecules/PreprodBanner",
  component: PreprodBanner,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof PreprodBanner>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preprod: Story = { args: { appEnv: "preprod" } };
// Hors préprod, rien ne s'affiche : la capture reste vide.
export const Production: Story = { args: { appEnv: "production" } };
