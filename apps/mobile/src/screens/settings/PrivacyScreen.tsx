import { ConsentManager } from "@nutrion/cmp/native";
import * as React from "react";
import { ScrollView, StyleSheet } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { useI18n } from "@/lib/i18n/useI18n";
import { useTheme } from "@/theme/useTheme";

/**
 * Écran Confidentialité des réglages : l'usager y change d'avis à tout moment. Sans lui, le
 * choix fait sur la feuille du premier lancement serait définitif (RGPD art. 7-3). Les comptes
 * ajoutent ici l'export des données et la suppression du compte (brique rgpd-droits-personnes).
 */
export function PrivacyScreen(): React.JSX.Element {
  const { t, locale } = useI18n();
  const { color } = useTheme();
  return (
    <ScrollView
      style={{ backgroundColor: color.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <AppText variant="h2" accessibilityRole="header">
        {t.consent.manager.title}
      </AppText>
      <ConsentManager copy={t.consent} locale={locale} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
});
