import { visualConfig } from "@nutrion/storybook-visual";

// Régression visuelle des stories mobile, à la taille d'un téléphone : `make visual`
// (cf tools/storybook-visual).
export default visualConfig({
  appDir: import.meta.dirname,
  viewport: { width: 390, height: 844 },
  // label-content-name-mismatch : react-native-web rend chaque <Text> en <div> sans espace
  // entre eux, axe lit alors « languefrançais » et ne le trouve pas dans « Langue, Français ».
  // Sur iOS et Android, le libellé lu (VoiceOver, Voice Control) contient bien les mots
  // affichés : faux positif propre au rendu web des composants natifs.
  axeDisabledRules: ["label-content-name-mismatch"],
});
