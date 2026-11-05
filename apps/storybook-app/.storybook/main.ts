import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { StorybookConfig } from "@storybook/react-native-web-vite";
import type { Alias, InlineConfig, Plugin } from "vite";

const packagesDir = fileURLToPath(new URL("../../../packages/", import.meta.url));
const mobileSrc = fileURLToPath(new URL("../../mobile/src", import.meta.url));

/**
 * react-native-web lit d'abord les fichiers `.web.tsx` ; le catalogue mobile veut la variante
 * `.native.tsx` des paquets du dépôt (packages/ui : `./atoms/Button`). Limité aux imports
 * relatifs de packages/ : les modules de node_modules gardent la résolution du framework.
 */
const nativeVariants: Plugin = {
  name: "native-variants",
  enforce: "pre",
  resolveId(source, importer) {
    if (!importer?.startsWith(packagesDir) || !source.startsWith(".")) return null;
    const candidate = resolve(dirname(importer), `${source}.native.tsx`);
    return existsSync(candidate) ? candidate : null;
  },
};

type Aliases = NonNullable<NonNullable<InlineConfig["resolve"]>["alias"]>;

/** Les alias du framework (react-native → react-native-web), objet ou liste. */
function aliasList(aliases: Aliases | undefined): Alias[] {
  if (!aliases) return [];
  if (Array.isArray(aliases)) return aliases as Alias[];
  return Object.entries(aliases).map(([find, replacement]) => ({ find, replacement }));
}

/**
 * `react-native` (déjà réécrit en `react-native-web` par le framework) se lit par
 * ./react-native.js dans le code du dépôt : `useColorScheme` y suit le thème de la barre
 * d'outils. Le module lui-même et node_modules gardent react-native-web tel quel.
 */
const shim = fileURLToPath(new URL("./react-native.js", import.meta.url));
const colorSchemeShim: Plugin = {
  name: "storybook-color-scheme",
  enforce: "pre",
  resolveId(source, importer) {
    if (source !== "react-native-web" || !importer) return null;
    if (importer === shim || importer.includes("/node_modules/")) return null;
    return shim;
  },
};

const config: StorybookConfig = {
  stories: ["../stories/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-docs"],
  framework: { name: "@storybook/react-native-web-vite", options: {} },
  // Rien ne part vers un service tiers : ni télémétrie, ni actualités de Storybook.
  core: { disableTelemetry: true, disableWhatsNewNotifications: true },
  // react-docgen suit les imports par sa propre résolution, sans l'alias vers
  // react-native-web : il tombe sur la source Flow de react-native et casse le build.
  typescript: { reactDocgen: false },
  viteFinal: (vite) => ({
    ...vite,
    plugins: [nativeVariants, colorSchemeShim, ...(vite.plugins ?? [])],
    resolve: {
      ...vite.resolve,
      // `@/` vise apps/mobile/src, comme dans l'app.
      alias: [...aliasList(vite.resolve?.alias), { find: /^@\//, replacement: `${mobileSrc}/` }],
    },
  }),
};

export default config;
