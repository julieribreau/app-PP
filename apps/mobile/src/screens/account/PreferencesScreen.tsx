import { locales } from "@nutrion/i18n";
import * as React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ListGroup, SectionLabel } from "@/components/layout/ListGroup";
import { Screen } from "@/components/layout/Screen";
import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { usePreferenceActions } from "@/hooks/account/usePreferences";
import { useI18n } from "@/lib/i18n/useI18n";
import { usePrefsStore } from "@/stores/prefs.store";
import { useTheme } from "@/theme/useTheme";
import type { ThemePreference } from "@/types/api";

const THEMES: ThemePreference[] = ["system", "light", "dark"];

// Langue et thème : appliqués tout de suite à l'app, enregistrés sur le profil si connecté.
export function PreferencesScreen() {
  const { t } = useI18n();
  const locale = usePrefsStore((s) => s.locale);
  const theme = usePrefsStore((s) => s.theme);
  const { changeLocale, changeTheme } = usePreferenceActions();
  return (
    <Screen edges={["bottom"]}>
      <SectionLabel>{t.locale.label}</SectionLabel>
      <View accessibilityRole="radiogroup" accessibilityLabel={t.locale.label}>
        <ListGroup>
          {locales.map((value) => (
            <RadioRow
              key={value}
              label={t.locale[value]}
              selected={locale === value}
              onPress={() => changeLocale(value)}
            />
          ))}
        </ListGroup>
      </View>
      <SectionLabel>{t.theme.label}</SectionLabel>
      <View accessibilityRole="radiogroup" accessibilityLabel={t.theme.label}>
        <ListGroup>
          {THEMES.map((value) => (
            <RadioRow
              key={value}
              label={t.theme[value]}
              selected={theme === value}
              onPress={() => changeTheme(value)}
            />
          ))}
        </ListGroup>
      </View>
    </Screen>
  );
}

function RadioRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { color } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      aria-checked={selected}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: color.muted }]}
    >
      <AppText variant="body" style={styles.flex}>
        {label}
      </AppText>
      {selected ? <Icon name="check" color={color.primary} size={20} strokeWidth={2.25} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: {
    minHeight: 52,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
});
