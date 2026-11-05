import * as ImagePicker from "expo-image-picker";
import * as React from "react";
import { Alert, StyleSheet, View } from "react-native";

import { ErrorState, Loading, Note, Screen } from "@/components/layout/Screen";
import { AppText } from "@/components/ui/AppText";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useMe, useRemoveAvatar, useUpdateMe, useUploadAvatar } from "@/hooks/account/useAccount";
import { authClient } from "@/lib/auth/auth-client";
import { isEmail } from "@/lib/auth/validation";
import { initials } from "@/lib/format/format";
import { useI18n } from "@/lib/i18n/useI18n";
import type { Me } from "@/types/api";

// Profil : photo (galerie), prénom, nom, e-mail (changement revérifié par Better Auth), téléphone.

export function ProfileScreen() {
  const me = useMe();
  if (me.isLoading)
    return (
      <Screen edges={[]}>
        <Loading />
      </Screen>
    );
  if (!me.data)
    return (
      <Screen edges={[]}>
        <ErrorState onRetry={() => void me.refetch()} />
      </Screen>
    );
  return <ProfileForm me={me.data} />;
}

function AvatarSection({ me, onError }: { me: Me; onError: () => void }) {
  const { t, f, date } = useI18n();
  const upload = useUploadAvatar();
  const removeAvatar = useRemoveAvatar();
  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted)
      return Alert.alert(t.account.changePhoto, t.mobile.account.photoPermission);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;
    upload.mutate(
      {
        uri: asset.uri,
        name: asset.fileName ?? "avatar.jpg",
        type: asset.mimeType ?? "image/jpeg",
      },
      { onError },
    );
  };
  return (
    <View style={styles.avatarRow}>
      <Avatar
        size={72}
        imageUrl={me.imageUrl}
        initials={initials(me.firstName, me.lastName, me.email)}
      />
      <View style={styles.flex}>
        <AppText variant="help">
          {f(t.account.memberSince, { date: date(me.createdAt, "month") })}
        </AppText>
        <View style={styles.photoButtons}>
          <Button
            label={t.account.changePhoto}
            variant="outline"
            icon="camera"
            loading={upload.isPending}
            onPress={() => void pickPhoto()}
          />
          {me.imageUrl ? (
            <Button
              label={t.account.removePhoto}
              variant="ghost"
              onPress={() => removeAvatar.mutate()}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

function ProfileForm({ me }: { me: Me }) {
  const { t } = useI18n();
  const update = useUpdateMe();
  const [form, setForm] = React.useState({
    firstName: me.firstName ?? "",
    lastName: me.lastName ?? "",
    email: me.email,
    phone: me.phone ?? "",
  });
  const [notice, setNotice] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const set = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const save = async () => {
    setError(null);
    setNotice(null);
    if (!isEmail(form.email)) return setError(t.mobile.auth.invalidEmail);
    try {
      await update.mutateAsync({
        firstName: form.firstName.trim() || null,
        lastName: form.lastName.trim() || null,
        phone: form.phone.trim() || null,
      });
      if (form.email.trim().toLowerCase() !== me.email.toLowerCase()) {
        const { error: emailError } = await authClient.changeEmail({
          newEmail: form.email.trim(),
          callbackURL: "nutrion://account",
        });
        if (emailError) throw emailError;
        setNotice(t.mobile.account.emailChangeSent);
      } else {
        setNotice(t.mobile.account.profileSaved);
      }
    } catch {
      setError(t.common.error);
    }
  };

  return (
    <Screen edges={["bottom"]}>
      <AvatarSection me={me} onError={() => setError(t.common.error)} />
      {notice ? <Note>{notice}</Note> : null}
      <TextField
        label={t.auth.firstName}
        value={form.firstName}
        onChangeText={set("firstName")}
        autoComplete="given-name"
      />
      <TextField
        label={t.auth.lastName}
        value={form.lastName}
        onChangeText={set("lastName")}
        autoComplete="family-name"
      />
      <TextField
        label={t.auth.email}
        help={t.account.emailChangeHelp}
        value={form.email}
        onChangeText={set("email")}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      <TextField
        label={t.account.phone}
        value={form.phone}
        onChangeText={set("phone")}
        keyboardType="phone-pad"
        autoComplete="tel"
        error={error}
      />
      <Button label={t.common.save} onPress={() => void save()} loading={update.isPending} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  avatarRow: { flexDirection: "row", gap: 16, alignItems: "center" },
  photoButtons: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
});
