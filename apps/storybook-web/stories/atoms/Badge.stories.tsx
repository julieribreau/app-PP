import type { Meta, StoryObj } from "@storybook/react-vite";

import { Badge } from "@/components/ui/badge";

// Un mot d'état ; côté boutique, seul « Rupture » est utilisé (ADR-002).
const meta = {
  title: "Atoms/Badge",
  component: Badge,
  tags: ["autodocs"],
  args: { children: "Rupture" },
} satisfies Meta<typeof Badge>;
export default meta;

type Story = StoryObj<typeof meta>;

export const OutOfStock: Story = { args: { tone: "muted" } };
export const Active: Story = { args: { tone: "success", children: "Actif" } };
export const Low: Story = { args: { tone: "warning", children: "Stock faible" } };
export const Suspended: Story = { args: { tone: "danger", children: "Suspendu" } };
export const Admin: Story = { args: { tone: "strong", children: "Admin" } };
