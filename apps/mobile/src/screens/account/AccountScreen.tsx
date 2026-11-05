import { router } from "expo-router";
import * as React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ListGroup, ListRow, SectionLabel, SwitchRow } from "@/components/layout/ListGroup";
import { Loading, Screen } from "@/components/layout/Screen";
import { AppText } from "@/components/ui/AppText";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useAddresses, useMe } from "@/hooks/account/useAccount";
import { useBiometricLabel } from "@/hooks/auth/useBiometricOffer";
import { useAuthActions, useSession } from "@/hooks/auth/useSession";
import { authenticate, biometricSupport, type BiometricSupport } from "@/lib/auth/biometric";
import { initials } from "@/lib/format/format";
import { useI18n } from "@/lib/i18n/useI18n";
import { ACCOUNT_ROUTES, PRIVACY_ROUTE, SIGN_IN_ROUTE, SIGN_UP_ROUTE } from "@/lib/routes";
import { usePrefsStore } from "@/stores/prefs.store";
import { useTheme } from "@/theme/useTheme";

// Compte (canvas CompteMobile). Déconnecté : invitation à se connecter et préférences de
// l'appareil. Connecté : profil, adresses, sécurité, préférences, données, déconnexion.

export function AccountScreen() {
  const { t } = useI18n();
  const { data: session, isPending } = useSession();
  return (
    <Screen>
      <AppText variant="display" accessibilityRole="header" style={styles.title}>
        {t.mobile.tabs.account}
      </AppText>
      {isPending ? <Loading /> : session?.user ? <SignedInAccount /> : <SignedOutAccount />}
    </Screen>
  );
}

function PreferenceRows() {
  const { t } = useI18n();
  const locale = usePrefsStore((s) => s.locale);
  const theme = usePrefsStore((s) => s.theme);
  return (
    <>
      <SectionLabel>{t.account.preferences}</SectionLabel>
      <ListGroup>
        <ListRow label={t.locale.label} value={t.locale[locale]} onPress={() => router.push(ACCOUNT_ROUTES.preferences)} />
        <ListRow label={t.theme.label} value={t.theme[theme]} onPress={() => router.push(ACCOUNT_ROUTES.preferences)} />
        <ListRow label={t.mobile.account.privacy} onPress={() => router.push(PRIVACY_ROUTE)} />
      </ListGroup>
    </>
  );
}

function SignedOutAccount() {
  const { color } = useTheme();
  const { t } = useI18n();
  return (
    <>
      <View style={[styles.card, { backgroundColor: color.card, borderColor: color.border }]}>
        <AppText variant="h2">{t.mobile.account.signedOutTitle}</AppText>
        <AppText variant="body" tone="muted">
          {t.mobile.account.signedOutBody}
        </AppText>
        <Button label={t.auth.signIn} onPress={() => router.push(SIGN_IN_ROUTE)} />
        <Button label={t.auth.signUpTab} variant="outline" onPress={() => router.push(SIGN_UP_ROUTE)} />
      </View>
      <PreferenceRows />
    </>
  );
}

function SignedInAccount() {
  const { t } = useI18n();
  const addresses = useAddresses();
  const { signOut } = useAuthActions();
  return (
    <>
      <ProfileCard />
      <SectionLabel>{t.mobile.account.informations}</SectionLabel>
      <ListGroup>
        <ListRow label={t.account.profile} value={t.account.profileHint} onPress={() => router.push(ACCOUNT_ROUTES.profile)} />
        <ListRow
          label={t.account.addresses}
          value={addresses.data ? String(addresses.data.length) : undefined}
          onPress={() => router.push(ACCOUNT_ROUTES.addresses)}
        />
      </ListGroup>
      <SecurityGroup />
      <PreferenceRows />
      <ListGroup>
        <ListRow label={t.account.export} onPress={() => router.push(ACCOUNT_ROUTES.data)} />
        <ListRow label={t.account.deleteAccount} destructive onPress={() => router.push(ACCOUNT_ROUTES.data)} />
      </ListGroup>
      <Button label={t.auth.signOut} variant="outline" onPress={() => void signOut()} />
    </>
  );
}

function ProfileCard() {
  const { color } = useTheme();
  const { t } = useI18n();
  const profile = useMe().data;
  if (!profile) return null;
  const shown = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.email;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t.account.profile}, ${shown}`}
      onPress={() => router.push(ACCOUNT_ROUTES.profile)}
      style={[styles.profileCard, { backgroundColor: color.card, borderColor: color.border }]}
    >
      <Avatar imageUrl={profile.imageUrl} initials={initials(profile.firstName, profile.lastName, profile.email)} />
      <View style={styles.flex}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {shown}
        </AppText>
        <AppText variant="help" numberOfLines={1}>
          {profile.email}
        </AppText>
      </View>
      <Icon name="chevronRight" color={color.mutedForeground} size={18} />
    </Pressable>
  );
}

function SecurityGroup() {
  const { t, f } = useI18n();
  const biometricEnabled = usePrefsStore((s) => s.biometricEnabled);
  const setBiometric = usePrefsStore((s) => s.setBiometric);
  const label = useBiometricLabel();
  const [support, setSupport] = React.useState<BiometricSupport | null>(null);
  React.useEffect(() => {
    void biometricSupport().then(setSupport);
  }, []);
  const toggle = (next: boolean) => {
    if (!next) return setBiometric(false);
    void authenticate(t.mobile.auth.biometricPrompt, t.common.cancel).then((ok) => ok && setBiometric(true));
  };
  return (
    <>
      <SectionLabel>{t.mobile.account.securitySection}</SectionLabel>
      <ListGroup>
        {support?.available ? (
          <SwitchRow label={f(t.account.biometric, { method: label(support.kind) })} value={biometricEnabled} onValueChange={toggle} />
        ) : null}
        <ListRow label={t.mobile.account.password} onPress={() => router.push(ACCOUNT_ROUTES.security)} />
        <ListRow label={t.account.devices} onPress={() => router.push(ACCOUNT_ROUTES.security)} />
      </ListGroup>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  title: { paddingHorizontal: 4, paddingTop: 8 },
  card: { borderWidth: 1, borderRadius: 20, padding: 20, gap: 12 },
  profileCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderWidth: 1, borderRadius: 20 },
});
