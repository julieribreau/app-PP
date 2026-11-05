import type { Meta, StoryObj } from "@storybook/react-vite";

import { ThemeToggle } from "@/components/layout/ThemeToggle";

// Clair, sombre ou système : menu au clavier (flèches, Entrée, Échap).
const meta = { title: "Molecules/ThemeToggle", component: ThemeToggle, tags: ["autodocs"] } satisfies Meta<typeof ThemeToggle>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
