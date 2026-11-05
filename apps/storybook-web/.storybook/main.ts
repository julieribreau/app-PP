import { fileURLToPath } from "node:url";

import type { StorybookConfig } from "@storybook/react-vite";

// Stories rangées comme les composants : stories/{atoms,molecules,organisms}/.
// `@/` vise apps/web/src, comme dans l'app : la story importe le composant par le même chemin.
const webSrc = fileURLToPath(new URL("../../web/src", import.meta.url));

const config: StorybookConfig = {
  stories: ["../stories/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-docs"],
  framework: { name: "@storybook/react-vite", options: {} },
  // Rien ne part vers un service tiers : ni télémétrie, ni actualités de Storybook.
  core: { disableTelemetry: true, disableWhatsNewNotifications: true },
  viteFinal: (vite) => ({
    ...vite,
    resolve: {
      ...vite.resolve,
      alias: [{ find: /^@\//, replacement: `${webSrc}/` }],
      // packages/ui : `./atoms/Button` se lit Button.web.tsx sur le web.
      extensions: [".web.tsx", ".web.ts", ".mjs", ".js", ".mts", ".ts", ".jsx", ".tsx", ".json"],
    },
  }),
};

export default config;
