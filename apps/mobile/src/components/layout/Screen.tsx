import * as React from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useI18n } from "@/lib/i18n/useI18n";
import { useTheme } from "@/theme/useTheme";

// Conteneur d'écran : fond du thème, zones sûres, défilement, clavier, tirer pour rafraîchir.

export interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  contentStyle?: ViewStyle;
  onRefresh?: () => void;
  refreshing?: boolean;
  footer?: React.ReactNode;
}

export function Screen({
  children,
  scroll = true,
  edges = ["top"],
  contentStyle,
  onRefresh,
  refreshing = false,
  footer,
}: ScreenProps) {
  const { color } = useTheme();
  return (
    <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: color.background }]}>
      {/* Avec défilement, iOS ajuste lui-même la zone visible au clavier : le padding du
          KeyboardAvoidingView ne compte pas le décalage d'une feuille modale (connexion,
          inscription) et laissait le champ mot de passe sous le clavier. */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" && !scroll ? "padding" : undefined}
      >
        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.content, contentStyle]}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            // Pavés numérique et téléphone sans touche de retour : glisser referme le clavier,
            // sinon il cachait « Enregistrer » sur le profil et l'adresse.
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            testID="screen-scroll"
            refreshControl={
              onRefresh ? (
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={color.primary}
                />
              ) : undefined
            }
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, contentStyle]}>{children}</View>
        )}
        {footer}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Note d'information sur fond `secondary` (panier invité, mise à jour du panier). */
export function Note({
  children,
  tone = "secondary",
}: {
  children: React.ReactNode;
  tone?: "secondary" | "info";
}) {
  const { color } = useTheme();
  const bg = tone === "info" ? color.info : color.secondary;
  const fg = tone === "info" ? color.infoForeground : color.secondaryForeground;
  return (
    <View accessibilityRole="text" style={[styles.note, { backgroundColor: bg }]}>
      <Icon name="info" color={fg} size={18} />
      <View style={styles.flex}>
        {typeof children === "string" ? (
          <AppText variant="small" style={{ color: fg }}>
            {children}
          </AppText>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

export function Loading() {
  const { color } = useTheme();
  const { t } = useI18n();
  return (
    <View
      style={styles.center}
      accessible
      accessibilityLabel={t.common.loading}
      accessibilityRole="progressbar"
    >
      <ActivityIndicator color={color.primary} size="large" />
    </View>
  );
}

export function ErrorState({ onRetry, message }: { onRetry?: () => void; message?: string }) {
  const { t } = useI18n();
  return (
    <View style={styles.center}>
      <AppText variant="body" style={styles.centerText} accessibilityLiveRegion="polite">
        {message ?? t.common.error}
      </AppText>
      {onRetry ? <Button label={t.common.retry} variant="outline" onPress={onRetry} /> : null}
    </View>
  );
}

export function EmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <View style={styles.center}>
      <AppText variant="body" tone="muted" style={styles.centerText}>
        {message}
      </AppText>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32, gap: 16 },
  note: {
    flexDirection: "row",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 32,
    minHeight: 240,
  },
  centerText: { textAlign: "center" },
});
