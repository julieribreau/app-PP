import * as React from "react";
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useTheme } from "@/theme/useTheme";

// Bouton en pilule (ADR-002). `primary` une fois par écran, pour le geste attendu ; désactivé
// sur fond `muted` (jamais une opacité, qui casserait le contraste du libellé).

export type ButtonVariant = "primary" | "outline" | "secondary" | "ghost" | "destructive";

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: "md" | "lg";
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
  style?: ViewStyle;
  testID?: string;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  disabled = false,
  loading = false,
  accessibilityHint,
  style,
  testID,
}: ButtonProps) {
  const { color } = useTheme();
  const inactive = disabled || loading;
  const palette: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
    primary: { bg: color.primary, fg: color.primaryForeground, border: color.primary },
    secondary: { bg: color.secondary, fg: color.secondaryForeground, border: color.secondary },
    outline: { bg: "transparent", fg: color.foreground, border: color.input },
    ghost: { bg: "transparent", fg: color.foreground, border: "transparent" },
    destructive: { bg: "transparent", fg: color.destructive, border: color.destructive },
  };
  const tone = disabled
    ? { bg: color.muted, fg: color.mutedForeground, border: color.muted }
    : palette[variant];
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      aria-disabled={inactive}
      aria-busy={loading}
      style={({ pressed }) => [
        styles.base,
        size === "lg" ? styles.lg : styles.md,
        { backgroundColor: tone.bg, borderColor: tone.border },
        pressed && !inactive && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={tone.fg} accessibilityLabel={label} />
      ) : (
        <View style={styles.row}>
          {icon ? <Icon name={icon} color={tone.fg} size={22} /> : null}
          <AppText variant="bodyMedium" style={{ color: tone.fg, textAlign: "center" }}>
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 9999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  md: { minHeight: 48 },
  lg: { minHeight: 52 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  pressed: { transform: [{ scale: 0.98 }] },
});
