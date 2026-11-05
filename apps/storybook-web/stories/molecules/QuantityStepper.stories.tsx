import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { QuantityStepper } from "@/components/shop/QuantityStepper";

function Demo({ max, initial }: { max: number; initial: number }) {
  const [value, setValue] = React.useState(initial);
  return <QuantityStepper value={value} max={max} onChange={setValue} />;
}

// Quantité bornée au stock ; − et + désactivés aux limites.
const meta = { title: "Molecules/QuantityStepper", component: Demo, tags: ["autodocs"], args: { max: 3, initial: 1 } } satisfies Meta<typeof Demo>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const AtStockLimit: Story = { args: { initial: 3 } };
