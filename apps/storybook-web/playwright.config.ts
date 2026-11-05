import { visualConfig } from "@nutrion/storybook-visual";

// Régression visuelle des stories web : `make visual` (cf tools/storybook-visual).
export default visualConfig({
  appDir: import.meta.dirname,
  viewport: { width: 1280, height: 720 },
});
