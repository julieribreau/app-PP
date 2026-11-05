// `react-native` du catalogue : react-native-web, sauf `useColorScheme`. Sur l'appareil, l'app
// force le thème par Appearance.setColorScheme et les composants le lisent par ce hook ;
// react-native-web ne suit que le thème du navigateur. Ici, il suit la barre d'outils.
export * from "react-native-web";
export { useStoryColorScheme as useColorScheme } from "./context";
