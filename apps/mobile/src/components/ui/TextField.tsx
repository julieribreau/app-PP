import * as React from "react";
import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { useTheme } from "@/theme/useTheme";

// Libellé toujours visible, champ de 48 pt au bord `input` (3:1), aide ou erreur reliée.

/** Instance du champ natif, pour `focus()`. */
export type TextFieldHandle = React.ComponentRef<typeof TextInput>;

export interface TextFieldProps extends Omit<TextInputProps, "style"> {
  /** Pour passer au champ suivant depuis la touche « Suivant » du clavier. */
  ref?: React.Ref<TextFieldHandle>;
  label: string;
  help?: string;
  error?: string | null;
}

export function TextField({ label, help, error, ...props }: TextFieldProps) {
  const { color } = useTheme();
  const [focused, setFocused] = React.useState(false);
  const message = error ?? help;
  return (
    <View style={styles.field}>
      <AppText variant="label">{label}</AppText>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={message ?? undefined}
        placeholderTextColor={color.mutedForeground}
        {...props}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        style={[
          styles.input,
          {
            backgroundColor: color.card,
            color: color.foreground,
            borderColor: error ? color.destructive : focused ? color.ring : color.input,
            borderWidth: focused ? 2 : 1,
          },
        ]}
      />
      {message ? (
        <AppText
          variant="help"
          tone={error ? "destructive" : "muted"}
          accessibilityLiveRegion={error ? "polite" : "none"}
        >
          {message}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  input: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontFamily: "DMSans_400Regular",
    fontSize: 16,
  },
});
