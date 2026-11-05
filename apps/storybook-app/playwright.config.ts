import { visualConfig } from "@nutrion/storybook-visual";

// Régression visuelle des stories mobile, à la taille d'un téléphone : `make visual`
// (cf tools/storybook-visual).
export default visualConfig({ appDir: import.meta.dirname, viewport: { width: 390, height: 844 } });
