import { router } from "expo-router";
import * as React from "react";
import { StyleSheet, View } from "react-native";

import { Note, Screen } from "@/components/layout/Screen";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { deleteMyAccount, exportMyData } from "@/hooks/account/useAccount";
import { useAuthActions } from "@/hooks/auth/useSession";
import { useI18n } from "@/lib/i18n/useI18n";
import { useTheme } from "@/theme/useTheme";

// Mes données (droits RGPD) : export ZIP partagé par la feuille du système, suppression du
// compte confirmée par un mot à saisir (contrat §Compte).

export function DataScreen() {
  const { color } = useTheme();
  const { t } = useI18n();
  const { signOut } = useAuthActions();
  const [exporting, setExporting] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [confirm, setConfirm] = React.useState("");
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const word = t.mobile.account.confirmWord;

  const runExport = async () => {
    setExporting(true);
    setNotice(null);
    try {
      await exportMyData();
      setNotice(t.mobile.account.exportReady);
    } catch {
      setNotice(t.common.error);
    } finally {
      setExporting(false);
    }
  };

  const runDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await deleteMyAccount(confirm.trim());
      await signOut({ forget: true });
      router.replace("/account");
    } catch {
      setError(t.common.error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Screen edges={["bottom"]}>
      <AppText variant="body" tone="muted">
        {t.account.dataLead}
      </AppText>
      {notice ? <Note>{notice}</Note> : null}
      <Button label={t.account.export} variant="outline" icon="download" loading={exporting} onPress={() => void runExport()} />
      <View style={[styles.danger, { borderColor: color.destructive }]}>
        <AppText variant="h2">{t.account.deleteConfirmTitle}</AppText>
        <AppText variant="small">{t.account.deleteConfirmBody}</AppText>
        <TextField
          label={t.account.deleteConfirmInput}
          value={confirm}
          onChangeText={setConfirm}
          autoCapitalize="characters"
          autoCorrect={false}
          error={error}
        />
        <Button
          label={t.account.deleteAccount}
          variant="destructive"
          disabled={confirm.trim().toUpperCase() !== word}
          loading={deleting}
          onPress={() => void runDelete()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  danger: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 12, marginTop: 8 },
});
