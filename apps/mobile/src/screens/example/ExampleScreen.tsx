import { View } from "react-native";
import { useExample } from "@/hooks/example/useExample";

// Écran d'un DOMAINE (src/screens/<domaine>/). Vocabulaire métier cohérent avec le backend.
// Composants partagés depuis @nutrion/ui ; strings via i18n.
export function ExampleScreen() {
  const { data } = useExample();
  return (
    <View>
      {data.map((item) => (
        // rendu de chaque élément via un composant @nutrion/ui
        <View key={item.id} />
      ))}
    </View>
  );
}
