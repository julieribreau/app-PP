import * as React from "react";
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from "react-native";

import { useConsentContext } from "../ConsentProvider";
import type { ConsentCopy } from "../copy";
import { usePalette, type ConsentColors } from "./palette";

export interface ConsentBannerProps {
  readonly copy: ConsentCopy;
  /** « Personnaliser » : l'app ouvre son écran Confidentialité. */
  readonly onCustomize: () => void;
  readonly colors?: Partial<ConsentColors>;
  /** Marge basse de la zone sûre (le paquet ne dépend pas de react-native-safe-area-context). */
  readonly bottomInset?: number;
}

/**
 * Feuille du premier lancement, ancrée en bas, tant qu'aucun choix ne vaut. Elle ne bloque pas
 * l'app : rien n'est mesuré sans un oui. VoiceOver et TalkBack l'annoncent dès qu'elle paraît.
 * « Refuser » et « Accepter » : même taille, même couleur, même poids.
 */
export function ConsentBanner(props: ConsentBannerProps): React.JSX.Element | null {
  const { copy, onCustomize, colors, bottomInset = 0 } = props;
  const { ready, record, acceptAll, rejectAll } = useConsentContext();
  const palette = usePalette(colors);
  const styles = React.useMemo(() => makeStyles(palette), [palette]);
  const visible = ready && record === null;

  React.useEffect(() => {
    if (visible) AccessibilityInfo.announceForAccessibility(copy.banner.title);
  }, [visible, copy.banner.title]);

  if (!visible) return null;

  return (
    <View style={[styles.sheet, { paddingBottom: 16 + bottomInset }]}>
      <Text style={styles.title} accessibilityRole="header">
        {copy.banner.title}
      </Text>
      <Text style={styles.body}>{copy.banner.body}</Text>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={rejectAll} style={styles.button}>
          <Text style={styles.buttonLabel}>{copy.banner.reject}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={acceptAll} style={styles.button}>
          <Text style={styles.buttonLabel}>{copy.banner.accept}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onCustomize} style={styles.link}>
          <Text style={styles.linkLabel}>{copy.banner.customize}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(palette: ConsentColors) {
  return StyleSheet.create({
    sheet: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      gap: 8,
      padding: 16,
      borderTopWidth: 1,
      borderColor: palette.input,
      backgroundColor: palette.bg,
    },
    title: { color: palette.fg, fontSize: 18, fontWeight: "700" },
    body: { color: palette.fg, fontSize: 15, lineHeight: 21 },
    actions: { gap: 8, marginTop: 8 },
    button: {
      minHeight: 48,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 8,
      backgroundColor: palette.primary,
    },
    buttonLabel: { color: palette.onPrimary, fontSize: 16, fontWeight: "600" },
    link: { minHeight: 48, justifyContent: "center", alignItems: "center" },
    linkLabel: { color: palette.fg, fontSize: 16, textDecorationLine: "underline" },
  });
}
