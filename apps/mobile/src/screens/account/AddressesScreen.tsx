import { router } from "expo-router";
import * as React from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";

import { EmptyState, ErrorState, Loading, Screen } from "@/components/layout/Screen";
import { AppText } from "@/components/ui/AppText";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import {
  useAddresses,
  useCreateAddress,
  useDefaultAddress,
  useDeleteAddress,
  useUpdateAddress,
} from "@/hooks/account/useAccount";
import { useI18n } from "@/lib/i18n/useI18n";
import { addressRoute } from "@/lib/routes";
import { useTheme } from "@/theme/useTheme";
import type { Address, AddressInput } from "@/types/api";

// Adresses de livraison : liste (par défaut en tête), création, modification, suppression.

export function AddressesScreen() {
  const { color } = useTheme();
  const { t } = useI18n();
  const addresses = useAddresses();
  const remove = useDeleteAddress();
  const makeDefault = useDefaultAddress();

  const confirmDelete = (address: Address) =>
    Alert.alert(t.mobile.account.deleteAddressConfirm, address.line1, [
      { text: t.common.cancel, style: "cancel" },
      { text: t.common.delete, style: "destructive", onPress: () => remove.mutate(address.id) },
    ]);

  return (
    <Screen edges={["bottom"]} onRefresh={() => void addresses.refetch()} refreshing={addresses.isRefetching}>
      {addresses.isLoading ? (
        <Loading />
      ) : addresses.isError ? (
        <ErrorState onRetry={() => void addresses.refetch()} />
      ) : (addresses.data ?? []).length === 0 ? (
        <EmptyState message={t.mobile.account.noAddress} />
      ) : (
        [...(addresses.data ?? [])]
          .sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
          .map((address) => (
            <View key={address.id} style={[styles.card, { backgroundColor: color.card, borderColor: color.border }]}>
              <View style={styles.cardHead}>
                <AppText variant="bodyStrong">{address.label || address.recipientName}</AppText>
                {address.isDefault ? <Badge label={t.account.address.default} tone="success" /> : null}
              </View>
              <AppText variant="help">
                {[address.recipientName, address.line1, address.line2, `${address.postalCode} ${address.city}`].filter(Boolean).join("\n")}
              </AppText>
              <View style={styles.actions}>
                <ActionLink label={t.common.edit} onPress={() => router.push(addressRoute(address.id))} />
                {address.isDefault ? null : (
                  <ActionLink label={t.account.address.makeDefault} onPress={() => makeDefault.mutate(address.id)} />
                )}
                <ActionLink label={t.common.delete} destructive onPress={() => confirmDelete(address)} />
              </View>
            </View>
          ))
      )}
      <Button label={t.account.addAddress} variant="outline" onPress={() => router.push(addressRoute("new"))} />
    </Screen>
  );
}

function ActionLink({ label, onPress, destructive }: { label: string; onPress: () => void; destructive?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8} style={styles.actionHit}>
      <AppText variant="label" tone={destructive ? "destructive" : "default"} style={styles.underline}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function AddressFormScreen({ id }: { id: string }) {
  const { t } = useI18n();
  const addresses = useAddresses();
  const create = useCreateAddress();
  const update = useUpdateAddress();
  const existing = addresses.data?.find((a) => a.id === id);
  const isNew = id === "new";
  if (!isNew && addresses.isLoading) return <Screen edges={[]}><Loading /></Screen>;
  return (
    <AddressForm
      key={existing?.id ?? "new"}
      initial={existing}
      busy={create.isPending || update.isPending}
      onSubmit={async (input) => {
        if (isNew) await create.mutateAsync(input);
        else await update.mutateAsync({ id, input });
        router.back();
      }}
      submitLabel={t.common.save}
    />
  );
}

type AddressFormValues = Record<"label" | "recipientName" | "line1" | "line2" | "postalCode" | "city" | "phone", string>;

const FORM_KEYS = ["label", "recipientName", "line1", "line2", "postalCode", "city", "phone"] as const;

export function toForm(initial?: Address): AddressFormValues {
  return Object.fromEntries(FORM_KEYS.map((key) => [key, initial?.[key] ?? ""])) as AddressFormValues;
}

export function toInput(form: AddressFormValues, countryCode = "FR"): AddressInput {
  const optional = (value: string) => value.trim() || null;
  return {
    label: optional(form.label),
    recipientName: form.recipientName.trim(),
    line1: form.line1.trim(),
    line2: optional(form.line2),
    postalCode: form.postalCode.trim(),
    city: form.city.trim(),
    countryCode,
    phone: optional(form.phone),
  };
}

function AddressForm({
  initial,
  onSubmit,
  busy,
  submitLabel,
}: {
  initial?: Address;
  onSubmit: (input: AddressInput) => Promise<void>;
  busy: boolean;
  submitLabel: string;
}) {
  const { t } = useI18n();
  const [form, setForm] = React.useState(() => toForm(initial));
  const [errors, setErrors] = React.useState<Partial<Record<keyof typeof form | "form", string>>>({});
  const set = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    const required: Array<keyof typeof form> = ["recipientName", "line1", "postalCode", "city"];
    const next: typeof errors = {};
    for (const key of required) if (!form[key].trim()) next[key] = t.mobile.auth.requiredField;
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    try {
      await onSubmit(toInput(form, initial?.countryCode));
    } catch {
      setErrors({ form: t.common.error });
    }
  };

  return (
    <Screen edges={["bottom"]}>
      <TextField label={t.account.address.label} value={form.label} onChangeText={set("label")} />
      <TextField label={t.account.address.recipient} value={form.recipientName} onChangeText={set("recipientName")} autoComplete="name" error={errors.recipientName} />
      <TextField label={t.account.address.line1} value={form.line1} onChangeText={set("line1")} autoComplete="address-line1" textContentType="streetAddressLine1" error={errors.line1} />
      <TextField label={t.account.address.line2} value={form.line2} onChangeText={set("line2")} autoComplete="address-line2" textContentType="streetAddressLine2" />
      <View style={styles.row}>
        <View style={styles.postal}>
          <TextField label={t.account.address.postalCode} value={form.postalCode} onChangeText={set("postalCode")} keyboardType="number-pad" autoComplete="postal-code" error={errors.postalCode} />
        </View>
        <View style={styles.flex}>
          <TextField label={t.account.address.city} value={form.city} onChangeText={set("city")} textContentType="addressCity" error={errors.city} />
        </View>
      </View>
      <TextField label={t.account.address.phone} value={form.phone} onChangeText={set("phone")} keyboardType="phone-pad" autoComplete="tel" />
      {errors.form ? <AppText variant="help" tone="destructive">{errors.form}</AppText> : null}
      <Button label={submitLabel} onPress={() => void submit()} loading={busy} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 6 },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginTop: 4 },
  actionHit: { minHeight: 44, justifyContent: "center" },
  underline: { textDecorationLine: "underline" },
  row: { flexDirection: "row", gap: 12 },
  postal: { width: 130 },
});
