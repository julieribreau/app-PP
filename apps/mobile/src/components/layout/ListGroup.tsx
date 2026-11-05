import * as React from "react";
import { Pressable, StyleSheet, Switch, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { useTheme } from "@/theme/useTheme";

// Listes groupées du compte (canvas CompteMobile) : carte `card`, rangées de 52 pt séparées
// par un filet, intitulé de section en mono capitales.

export function SectionLabel({ children }: { children: string }) {
  return (
    <AppText variant="overline" accessibilityRole="header" style={styles.section}>
      {children}
    </AppText>
  );
}

export function ListGroup({ children }: { children: React.ReactNode }) {
  const { color } = useTheme();
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[styles.group, { backgroundColor: color.card, borderColor: color.border }]}>
      {rows.map((row, index) => (
        <View
          key={index}
          style={
            index < rows.length - 1
              ? { borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: color.border }
              : null
          }
        >
          {row}
        </View>
      ))}
    </View>
  );
}

export interface ListRowProps {
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  chevron?: boolean;
  accessibilityHint?: string;
}

export function ListRow({
  label,
  value,
  onPress,
  destructive = false,
  chevron = true,
  accessibilityHint,
}: ListRowProps) {
  const { color } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityLabel={value ? `${label}, ${value}` : label}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: color.muted }]}
    >
      <AppText variant="body" tone={destructive ? "destructive" : "default"} style={styles.flex}>
        {label}
      </AppText>
      {value ? (
        <AppText variant="help" numberOfLines={1} style={styles.value}>
          {value}
        </AppText>
      ) : null}
      {onPress && chevron && !destructive ? (
        <Icon name="chevronRight" color={color.mutedForeground} size={18} />
      ) : null}
    </Pressable>
  );
}

export function SwitchRow({
  label,
  value,
  onValueChange,
  disabled,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const { color } = useTheme();
  return (
    <View style={styles.row}>
      <AppText
        variant="body"
        style={styles.flex}
        importantForAccessibility="no"
        accessibilityElementsHidden
      >
        {label}
      </AppText>
      <Switch
        accessibilityLabel={label}
        value={value}
        disabled={disabled}
        onValueChange={onValueChange}
        trackColor={{ false: color.input, true: color.success }}
        thumbColor={color.card}
        ios_backgroundColor={color.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: 4, marginTop: 8 },
  group: { borderWidth: 1, borderRadius: 20, overflow: "hidden" },
  row: {
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  flex: { flex: 1 },
  value: { maxWidth: "50%" },
});
