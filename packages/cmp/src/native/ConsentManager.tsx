import * as React from "react";
import { AccessibilityInfo, Pressable, StyleSheet, Switch, Text, View } from "react-native";

import { useConsentContext } from "../ConsentProvider";
import { purposeText, withDate, type ConsentCopy } from "../copy";
import type { ConsentChoices } from "../types";
import { usePalette, type ConsentColors } from "./palette";

export interface ConsentManagerProps {
  readonly copy: ConsentCopy;
  /** Langue de l'app, pour les dates. */
  readonly locale: string;
  readonly colors?: Partial<ConsentColors>;
}

/**
 * Réglage des consentements, dans l'écran Confidentialité : un interrupteur par finalité, puis
 * « Enregistrer ». Retirer son accord y est aussi simple que le donner (RGPD art. 7-3).
 */
export function ConsentManager({ copy, locale, colors }: ConsentManagerProps): React.JSX.Element {
  const { config, record, save, acceptAll, rejectAll } = useConsentContext();
  const [draft, setDraft] = React.useState<ConsentChoices>(() => ({ ...record?.choices }));
  const palette = usePalette(colors);
  const styles = React.useMemo(() => makeStyles(palette), [palette]);

  // Le choix stocké arrive après le premier rendu (lecture asynchrone) : le brouillon le suit.
  React.useEffect(() => setDraft({ ...record?.choices }), [record]);

  const decide = (action: () => void) => {
    action();
    AccessibilityInfo.announceForAccessibility(copy.manager.saved);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{copy.manager.intro}</Text>
      {record ? (
        <Text style={styles.muted}>{withDate(copy.manager.savedOn, record.decidedAt, locale)}</Text>
      ) : null}
      {config.purposes.map((purpose) => {
        const text = purposeText(copy, purpose.id);
        return (
          <View key={purpose.id} style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.label}>{text.label}</Text>
              <Text style={styles.muted}>{text.description}</Text>
            </View>
            {purpose.required ? (
              <Text style={styles.muted}>{copy.manager.required}</Text>
            ) : (
              <Switch
                accessibilityLabel={text.label}
                accessibilityHint={text.description}
                value={draft[purpose.id] === true}
                onValueChange={(value) =>
                  setDraft((current) => ({ ...current, [purpose.id]: value }))
                }
                trackColor={{ false: palette.mutedForeground, true: palette.primary }}
              />
            )}
          </View>
        );
      })}
      <Pressable accessibilityRole="button" style={styles.button} onPress={() => decide(rejectAll)}>
        <Text style={styles.buttonLabel}>{copy.manager.rejectAll}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" style={styles.button} onPress={() => decide(acceptAll)}>
        <Text style={styles.buttonLabel}>{copy.manager.acceptAll}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        style={styles.outline}
        onPress={() => decide(() => save(draft))}
      >
        <Text style={styles.text}>{copy.manager.save}</Text>
      </Pressable>
    </View>
  );
}

function makeStyles(palette: ConsentColors) {
  const button = {
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 2,
    borderColor: palette.primary,
  } as const;
  return StyleSheet.create({
    container: { gap: 12 },
    text: { color: palette.fg, fontSize: 16, lineHeight: 22 },
    muted: { color: palette.mutedForeground, fontSize: 14, lineHeight: 20 },
    label: { color: palette.fg, fontSize: 16, fontWeight: "600" },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderColor: palette.input,
    },
    rowText: { flex: 1, gap: 4 },
    button: { ...button, backgroundColor: palette.primary },
    buttonLabel: { color: palette.onPrimary, fontSize: 16, fontWeight: "600" },
    outline: button,
  });
}
