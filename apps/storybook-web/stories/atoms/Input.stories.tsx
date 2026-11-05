import type { Meta, StoryObj } from "@storybook/react-vite";

import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

// Champ avec libellé toujours visible, aide ou erreur reliées (aria-describedby).
function Demo({ error, help }: { error?: string; help?: string }) {
  return (
    <div style={{ maxWidth: 360 }}>
      <Field id="demo" label="Adresse e-mail" help={help} error={error}>
        <Input type="email" defaultValue="camille@exemple.fr" />
      </Field>
    </div>
  );
}

const meta = { title: "Atoms/Input", component: Demo, tags: ["autodocs"] } satisfies Meta<typeof Demo>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { help: "Pour suivre vos commandes." } };
export const WithError: Story = { args: { error: "Adresse e-mail invalide." } };
