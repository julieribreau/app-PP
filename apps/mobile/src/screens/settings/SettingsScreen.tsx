import { tokens } from "@nutrion/ui-tokens";
import { router } from "expo-router";
import * as React from "react";
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme } from "react-native";

import { messages } from "@/lib/i18n/messages";
import { PRIVACY_ROUTE } from "@/lib/routes";

/** Réglages : chaque entrée ouvre son écran. Confidentialité y est toujours. */
export function SettingsScreen(): React.JSX.Element {
  const t = messages();
  const palette = tokens.color[useColorScheme() === "dark" ? "dark" : "light"];
  return (
    <ScrollView style={{ backgroundColor: palette.bg }} contentContainerStyle={styles.content}>
      <Pressable
        accessibilityRole="button"
        accessibilityHint={t.settings.privacyHint}
        onPress={() => router.push(PRIVACY_ROUTE)}
        style={[styles.row, { borderColor: palette.input }]}
      >
        <Text style={[styles.label, { color: palette.fg }]}>{t.settings.privacy}</Text>
        <Text style={{ color: palette.mutedForeground }}>{t.settings.privacyHint}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  row: {
    minHeight: 56,
    justifyContent: "center",
    gap: 4,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  label: { fontSize: 16, fontWeight: "600" },
});
