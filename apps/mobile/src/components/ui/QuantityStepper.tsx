import * as React from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useI18n } from "@/lib/i18n/useI18n";
import { useTheme } from "@/theme/useTheme";

// Quantité ±1, bornée [1, max]. Avec `onRemove`, le « − » devient une corbeille à 1 : retirer
// l'article du panier se fait du même geste.

export interface QuantityStepperProps {
  value: number;
  max: number;
  onChange: (value: number) => void;
  onRemove?: () => void;
  /** Nom de l'article, pour les libellés accessibles du panier. */
  itemName?: string;
  size?: "sm" | "md";
  disabled?: boolean;
  /** Préfixe des identifiants de test des boutons (défaut « stepper »). */
  testID?: string;
}

function useStepperLabels(itemName: string | undefined, removes: boolean) {
  const { t, f } = useI18n();
  return {
    group: itemName ? f(t.cart.quantityOf, { name: itemName }) : t.product.quantity,
    decrease: removes && itemName ? f(t.cart.remove, { name: itemName }) : t.product.decrease,
    increase: t.product.increase,
  };
}

export function QuantityStepper({
  value,
  max,
  onChange,
  onRemove,
  itemName,
  size = "md",
  disabled = false,
  testID = "stepper",
}: QuantityStepperProps) {
  const { color } = useTheme();
  const removes = value <= 1 && onRemove !== undefined;
  const labels = useStepperLabels(itemName, removes);
  const decrease = () => (removes ? onRemove?.() : onChange(value - 1));
  return (
    <View
      // iOS et Android : élément réglable (balayage haut/bas), ses deux boutons restant
      // atteignables. Le web n'a pas d'équivalent qui contienne des boutons (un slider ne
      // peut pas en imbriquer) : simple groupe nommé, la valeur dite par son libellé.
      {...(Platform.OS === "web"
        ? { role: "group" as const, accessibilityLabel: `${labels.group} : ${value}` }
        : { accessibilityRole: "adjustable" as const, accessibilityLabel: labels.group })}
      accessibilityValue={{ min: 1, max, now: value, text: String(value) }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === "increment" && value < max) onChange(value + 1);
        if (e.nativeEvent.actionName === "decrement" && value > 1) onChange(value - 1);
      }}
      style={[styles.group, { borderColor: color.input }]}
    >
      <StepButton
        testID={`${testID}-decrease`}
        icon={removes ? "trash" : "minus"}
        label={labels.decrease}
        size={size}
        disabled={disabled || (value <= 1 && !removes)}
        onPress={decrease}
      />
      <AppText
        variant="price"
        style={styles.value}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        {value}
      </AppText>
      <StepButton
        testID={`${testID}-increase`}
        icon="plus"
        label={labels.increase}
        size={size}
        disabled={disabled || value >= max}
        onPress={() => onChange(value + 1)}
      />
    </View>
  );
}

function StepButton(props: {
  testID: string;
  icon: IconName;
  label: string;
  size: "sm" | "md";
  disabled: boolean;
  onPress: () => void;
}) {
  const { color } = useTheme();
  const box = props.size === "sm" ? 40 : 44;
  return (
    <Pressable
      testID={props.testID}
      accessibilityRole="button"
      accessibilityLabel={props.label}
      aria-disabled={props.disabled}
      disabled={props.disabled}
      hitSlop={props.size === "sm" ? 2 : 0}
      onPress={props.onPress}
      style={[styles.button, { width: box, height: box }]}
    >
      <Icon
        name={props.icon}
        size={props.size === "sm" ? 16 : 18}
        strokeWidth={2}
        color={props.disabled ? color.border : color.foreground}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 9999 },
  button: { alignItems: "center", justifyContent: "center" },
  value: { minWidth: 24, textAlign: "center" },
});
