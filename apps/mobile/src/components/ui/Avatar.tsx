import { Image } from "expo-image";
import * as React from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { useTheme } from "@/theme/useTheme";

/** Photo de profil ou initiales sur fond pêche. Décoratif : le nom est écrit à côté. */
export function Avatar({ imageUrl, initials, size = 52 }: { imageUrl: string | null; initials: string; size?: number }) {
  const { color } = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.box, { width: size, height: size, borderRadius: size / 2, backgroundColor: color.peach }]}
    >
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <AppText variant="bodyStrong" style={{ fontSize: size * 0.35, lineHeight: size * 0.45, color: color.foreground }}>
          {initials}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
});
