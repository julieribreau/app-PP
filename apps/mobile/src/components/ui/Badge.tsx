import * as React from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { useTheme } from "@/theme/useTheme";

// Un ou deux mots d'état. Côté boutique, seul « Rupture » s'affiche (ADR-002) ; les autres tons
// servent l'espace personnel (adresse par défaut…). Toujours un mot : la couleur seule ne
// suffit pas.

export type BadgeTone = "muted" | "success" | "warning" | "info" | "accent";

export function Badge({ label, tone = "muted" }: { label: string; tone?: BadgeTone }) {
  const { color } = useTheme();
  const tones: Record<BadgeTone, { bg: string; fg: string }> = {
    muted: { bg: color.muted, fg: color.mutedForeground },
    success: { bg: color.success, fg: color.successForeground },
    warning: { bg: color.warning, fg: color.warningForeground },
    info: { bg: color.info, fg: color.infoForeground },
    accent: { bg: color.accent, fg: color.accentForeground },
  };
  const { bg, fg } = tones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <AppText variant="caption" style={{ color: fg, fontSize: 12, lineHeight: 18 }}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 8,
    minHeight: 22,
    justifyContent: "center",
  },
});
