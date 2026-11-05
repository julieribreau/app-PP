import { DMMono_400Regular } from "@expo-google-fonts/dm-mono/400Regular";
import { DMMono_500Medium } from "@expo-google-fonts/dm-mono/500Medium";
import { DMSans_400Regular } from "@expo-google-fonts/dm-sans/400Regular";
import { DMSans_500Medium } from "@expo-google-fonts/dm-sans/500Medium";
import { DMSans_600SemiBold } from "@expo-google-fonts/dm-sans/600SemiBold";
import { Fraunces_600SemiBold } from "@expo-google-fonts/fraunces/600SemiBold";

// Polices de la piste B (ADR-002), chargées au démarrage sous les noms de tokens.font. Import
// par graisse : la racine du paquet embarquerait toutes les graisses dans le bundle.
export const appFonts = {
  Fraunces_600SemiBold,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMMono_400Regular,
  DMMono_500Medium,
};
