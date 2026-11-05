import type { Meta, StoryObj } from "@storybook/react-vite";

import { LocaleSwitch } from "@/components/layout/LocaleSwitch";

// FR ⇄ EN ; l'étiquette annonce la langue courante et la cible.
const meta = { title: "Molecules/LocaleSwitch", component: LocaleSwitch, tags: ["autodocs"] } satisfies Meta<typeof LocaleSwitch>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
