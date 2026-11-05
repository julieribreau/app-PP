import * as React from "react";
import { Pressable, StyleSheet } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { useTheme } from "@/theme/useTheme";
import type { ColorTokens } from "@nutrion/ui-tokens";

// Puce de filtre ou de choix d'option : encre pleine quand choisie, bord `input` sinon.

export interface ChipProps {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  size?: "sm" | "md";
  /** « radio » pour une option exclusive (saveur, format), « button » pour un filtre. */
  role?: "radio" | "button";
}

function chipTone(color: ColorTokens, selected: boolean, disabled: boolean) {
  if (selected) return { bg: color.foreground, border: color.foreground, fg: color.background };
  if (disabled) return { bg: "transparent", border: color.border, fg: color.mutedForeground };
  return { bg: "transparent", border: color.input, fg: color.foreground };
}

export function Chip({
  label,
  selected = false,
  disabled = false,
  onPress,
  size = "md",
  role = "button",
}: ChipProps) {
  const { color } = useTheme();
  const tone = chipTone(color, selected, disabled);
  const state = role === "radio" ? { checked: selected, disabled } : { selected, disabled };
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityState={state}
      style={[styles.base, styles[size], { backgroundColor: tone.bg, borderColor: tone.border }]}
    >
      <AppText variant="label" style={[{ color: tone.fg }, disabled && styles.struck]}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: 9999, borderWidth: 1, justifyContent: "center", paddingHorizontal: 16 },
  sm: { minHeight: 44 },
  md: { minHeight: 44 },
  struck: { textDecorationLine: "line-through" },
});
