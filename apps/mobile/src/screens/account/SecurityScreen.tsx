import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { StyleSheet, View } from "react-native";

import { ListGroup, SectionLabel } from "@/components/layout/ListGroup";
import { Note, Screen } from "@/components/layout/Screen";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useSession } from "@/hooks/auth/useSession";
import { queryKeys } from "@/lib/api/query";
import { authClient } from "@/lib/auth/auth-client";
import { isStrongPassword } from "@/lib/auth/validation";
import { useI18n } from "@/lib/i18n/useI18n";

// Sécurité : changement de mot de passe et appareils connectés (sessions Better Auth).

export function SecurityScreen() {
  const { t } = useI18n();
  return (
    <Screen edges={["bottom"]}>
      <SectionLabel>{t.account.changePassword}</SectionLabel>
      <ChangePassword />
      <SectionLabel>{t.account.devices}</SectionLabel>
      <Sessions />
    </Screen>
  );
}

function ChangePassword() {
  const { t } = useI18n();
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const submit = async () => {
    setDone(false);
    if (!isStrongPassword(next)) return setError(t.mobile.auth.weakPassword);
    setBusy(true);
    const { error: apiError } = await authClient.changePassword({
      currentPassword: current,
      newPassword: next,
      revokeOtherSessions: true,
    });
    setBusy(false);
    if (apiError) return setError(t.auth.invalidCredentials);
    setError(null);
    setCurrent("");
    setNext("");
    setDone(true);
  };

  return (
    <View style={styles.block}>
      {done ? <Note>{t.mobile.account.passwordUpdated}</Note> : null}
      <TextField
        label={t.account.currentPassword}
        value={current}
        onChangeText={setCurrent}
        secureTextEntry
        autoComplete="current-password"
      />
      <TextField
        label={t.auth.newPassword}
        help={t.auth.passwordHelp}
        value={next}
        onChangeText={setNext}
        secureTextEntry
        autoComplete="new-password"
        error={error}
      />
      <Button
        label={t.account.changePassword}
        variant="outline"
        onPress={() => void submit()}
        loading={busy}
        disabled={!current || !next}
      />
    </View>
  );
}

interface SessionRow {
  id: string;
  token: string;
  userAgent?: string | null;
  updatedAt: string | Date;
}

/** « iPhone · app NutrionApp » plutôt qu'un user-agent brut. */
export function deviceName(userAgent: string | null | undefined, fallback: string): string {
  if (!userAgent) return fallback;
  if (/iPhone|iOS|CFNetwork|Darwin/i.test(userAgent)) return "iPhone";
  if (/iPad/i.test(userAgent)) return "iPad";
  if (/Android|okhttp/i.test(userAgent)) return "Android";
  if (/Macintosh/i.test(userAgent)) return "Mac";
  if (/Windows/i.test(userAgent)) return "Windows";
  return fallback;
}

function Sessions() {
  const { t, date } = useI18n();
  const client = useQueryClient();
  const { data: session } = useSession();
  const sessions = useQuery({
    queryKey: queryKeys.sessions,
    queryFn: async () => ((await authClient.listSessions()).data ?? []) as SessionRow[],
  });
  const revoke = async (token: string) => {
    await authClient.revokeSession({ token });
    await client.invalidateQueries({ queryKey: queryKeys.sessions });
  };
  return (
    <ListGroup>
      {(sessions.data ?? []).map((row) => {
        const current = row.token === session?.session.token;
        return (
          <View key={row.id} style={styles.sessionRow}>
            <View style={styles.flex}>
              <AppText variant="body">
                {deviceName(row.userAgent, t.mobile.account.unknownDevice)}
              </AppText>
              <AppText variant="help">{date(new Date(row.updatedAt).toISOString())}</AppText>
            </View>
            {current ? (
              <AppText variant="help">{t.account.thisSession}</AppText>
            ) : (
              <Button
                label={t.account.revoke}
                variant="ghost"
                onPress={() => void revoke(row.token)}
              />
            )}
          </View>
        );
      })}
    </ListGroup>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  block: { gap: 14 },
  sessionRow: {
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
});
