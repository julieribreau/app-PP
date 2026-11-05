import { router } from "expo-router";
import * as React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Screen } from "@/components/layout/Screen";
import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { useI18n } from "@/lib/i18n/useI18n";
import { useTheme } from "@/theme/useTheme";

// Gabarit des écrans d'accès (canvas ConnexionMobile) : bandeau terracotta avec les formes de
// la marque, puis le formulaire.

export function AuthLayout({
  title,
  lead,
  children,
  closable = true,
}: {
  title: string;
  lead?: string;
  children: React.ReactNode;
  closable?: boolean;
}) {
  const { color } = useTheme();
  const { t } = useI18n();
  return (
    <Screen edges={["bottom"]} contentStyle={styles.content}>
      <View
        style={[styles.band, { backgroundColor: color.primary }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <View style={[styles.disc, { backgroundColor: color.peach }]} />
        <View style={[styles.pill, { backgroundColor: color.straw }]} />
        <AppText variant="h2" tone="onPrimary" style={styles.brand}>
          {t.common.appName}
        </AppText>
      </View>
      {closable ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.common.close}
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
          style={[styles.close, { backgroundColor: color.card }]}
        >
          <Icon name="close" color={color.foreground} size={20} />
        </Pressable>
      ) : null}
      <View style={styles.body}>
        <View style={styles.heading}>
          <AppText variant="h1" accessibilityRole="header">
            {title}
          </AppText>
          {lead ? (
            <AppText variant="body" tone="muted">
              {lead}
            </AppText>
          ) : null}
        </View>
        {children}
      </View>
    </Screen>
  );
}

export function OrDivider() {
  const { color } = useTheme();
  const { t } = useI18n();
  return (
    <View
      style={styles.divider}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={[styles.rule, { backgroundColor: color.border }]} />
      <AppText variant="help">{t.auth.or}</AppText>
      <View style={[styles.rule, { backgroundColor: color.border }]} />
    </View>
  );
}

export function TextLink({
  label,
  onPress,
  strong = false,
  testID,
}: {
  label: string;
  onPress: () => void;
  strong?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="link"
      onPress={onPress}
      hitSlop={12}
      style={styles.linkHit}
    >
      <AppText
        variant={strong ? "label" : "help"}
        tone={strong ? "default" : "muted"}
        style={styles.link}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 0, paddingTop: 0, gap: 0 },
  band: { height: 240, overflow: "hidden" },
  disc: { position: "absolute", right: -40, top: 40, width: 180, height: 180, borderRadius: 90 },
  pill: { position: "absolute", left: 40, bottom: -60, width: 110, height: 160, borderRadius: 55 },
  brand: { position: "absolute", left: 24, top: 52 },
  close: {
    position: "absolute",
    right: 16,
    top: 56,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 32, gap: 16 },
  heading: { gap: 4 },
  divider: { flexDirection: "row", alignItems: "center", gap: 12 },
  rule: { flex: 1, height: 1 },
  linkHit: { minHeight: 44, justifyContent: "center" },
  link: { textDecorationLine: "underline" },
});
