import * as React from "react";
import { StyleSheet, Text, type TextProps, type TextStyle } from "react-native";

import { useTheme } from "@/theme/useTheme";

// Typographie de la piste B : Fraunces pour les titres et noms de produit, DM Sans pour le
// texte, DM Mono pour les prix et catégories. Les tailles suivent le réglage d'accessibilité
// de l'appareil (allowFontScaling par défaut), plafonnées là où la mise en page est serrée.

export type TextVariant =
  | "display"
  | "h1"
  | "h2"
  | "title"
  | "body"
  | "bodyMedium"
  | "bodyStrong"
  | "label"
  | "small"
  | "help"
  | "overline"
  | "price"
  | "priceLarge"
  | "caption";

export type TextTone =
  "default" | "muted" | "primary" | "onPrimary" | "destructive" | "onSecondary";

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  tone?: TextTone;
}

export function AppText({ variant = "body", tone, style, ...props }: AppTextProps) {
  const theme = useTheme();
  const base = VARIANTS[variant];
  const defaultTone: TextTone = variant === "help" || variant === "overline" ? "muted" : "default";
  const colors: Record<TextTone, string> = {
    default: theme.color.foreground,
    muted: theme.color.mutedForeground,
    primary: theme.color.primary,
    onPrimary: theme.color.primaryForeground,
    destructive: theme.color.destructive,
    onSecondary: theme.color.secondaryForeground,
  };
  return (
    <Text
      maxFontSizeMultiplier={variant === "overline" || variant === "caption" ? 1.4 : 2}
      {...props}
      style={[base, { color: colors[tone ?? defaultTone] }, style]}
    />
  );
}

const VARIANTS: Record<TextVariant, TextStyle> = StyleSheet.create({
  display: {
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  h1: { fontFamily: "Fraunces_600SemiBold", fontSize: 30, lineHeight: 34, letterSpacing: -0.45 },
  h2: { fontFamily: "Fraunces_600SemiBold", fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  title: { fontFamily: "Fraunces_600SemiBold", fontSize: 17, lineHeight: 22, letterSpacing: -0.2 },
  body: { fontFamily: "DMSans_400Regular", fontSize: 16, lineHeight: 24 },
  bodyMedium: { fontFamily: "DMSans_500Medium", fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: "DMSans_600SemiBold", fontSize: 16, lineHeight: 24 },
  label: { fontFamily: "DMSans_500Medium", fontSize: 14, lineHeight: 20 },
  small: { fontFamily: "DMSans_400Regular", fontSize: 14, lineHeight: 20 },
  help: { fontFamily: "DMSans_400Regular", fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: "DMSans_500Medium", fontSize: 11, lineHeight: 14 },
  overline: {
    fontFamily: "DMMono_500Medium",
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  price: { fontFamily: "DMMono_500Medium", fontSize: 15, lineHeight: 20 },
  priceLarge: { fontFamily: "DMMono_500Medium", fontSize: 22, lineHeight: 28 },
});
