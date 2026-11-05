import { ConsentManager } from "@nutrion/cmp/native";
import { tokens } from "@nutrion/ui-tokens";
import * as React from "react";
import { ScrollView, StyleSheet, Text, useColorScheme } from "react-native";

import { deviceLocale, messages } from "@/lib/i18n/messages";

/**
 * Écran Confidentialité des réglages : l'usager y change d'avis à tout moment. Sans lui, le
 * choix fait sur la feuille du premier lancement serait définitif (RGPD art. 7-3). Les comptes
 * ajoutent ici l'export des données et la suppression du compte (brique rgpd-droits-personnes).
 */
export function PrivacyScreen(): React.JSX.Element {
  const locale = deviceLocale();
  const t = messages(locale);
  const palette = tokens.color[useColorScheme() === "dark" ? "dark" : "light"];
  return (
    <ScrollView
      style={{ backgroundColor: palette.bg }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Text style={[styles.title, { color: palette.fg }]} accessibilityRole="header">
        {t.consent.manager.title}
      </Text>
      <ConsentManager copy={t.consent} locale={locale} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  title: { fontSize: 20, fontWeight: "700" },
});
