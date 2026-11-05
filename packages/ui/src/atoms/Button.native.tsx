import { tokens } from "@nutrion/ui-tokens";
import { Pressable, StyleSheet, Text, useColorScheme } from "react-native";

// Variante NATIVE — même API (mêmes props) que Button.web.tsx. La divergence est dans
// l'implémentation : React Native ne lit pas le CSS, les tokens arrivent en valeurs.
// Story : apps/storybook-app/stories/atoms/Button.stories.tsx.
export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}

export function Button({ label, onPress, variant = "primary", disabled = false }: ButtonProps) {
  const palette = tokens.color[useColorScheme() === "dark" ? "dark" : "light"];
  const primary = variant === "primary";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={[
        styles.base,
        {
          borderColor: palette.primary,
          backgroundColor: primary ? palette.primary : "transparent",
        },
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.label, { color: primary ? palette.onPrimary : palette.primary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: tokens.space[4],
    borderRadius: tokens.radius.full,
    borderWidth: 2,
  },
  label: { fontSize: 16, fontWeight: "600" },
  disabled: { opacity: 0.5 },
});
