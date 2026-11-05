import { router } from "expo-router";
import * as React from "react";
import { StyleSheet, View } from "react-native";

import { Loading, Screen } from "@/components/layout/Screen";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useAddresses, useCreateAddress, useUpdateAddress } from "@/hooks/account/useAccount";
import { useI18n } from "@/lib/i18n/useI18n";
import type { Address, AddressInput } from "@/types/api";

// Création ou modification d'une adresse de livraison (« new » pour une nouvelle).

export function AddressFormScreen({ id }: { id: string }) {
  const { t } = useI18n();
  const addresses = useAddresses();
  const create = useCreateAddress();
  const update = useUpdateAddress();
  const existing = addresses.data?.find((a) => a.id === id);
  const isNew = id === "new";
  if (!isNew && addresses.isLoading)
    return (
      <Screen edges={[]}>
        <Loading />
      </Screen>
    );
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

type AddressFormValues = Record<
  "label" | "recipientName" | "line1" | "line2" | "postalCode" | "city" | "phone",
  string
>;

const FORM_KEYS = [
  "label",
  "recipientName",
  "line1",
  "line2",
  "postalCode",
  "city",
  "phone",
] as const;

export function toForm(initial?: Address): AddressFormValues {
  return Object.fromEntries(
    FORM_KEYS.map((key) => [key, initial?.[key] ?? ""]),
  ) as AddressFormValues;
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

type AddressErrors = Partial<Record<keyof AddressFormValues | "form", string>>;

function AddressFields({
  form,
  set,
  errors,
}: {
  form: AddressFormValues;
  set: (key: keyof AddressFormValues) => (value: string) => void;
  errors: AddressErrors;
}) {
  const { t } = useI18n();
  return (
    <>
      <TextField
        testID="address-label"
        label={t.account.address.label}
        value={form.label}
        onChangeText={set("label")}
      />
      <TextField
        testID="address-recipient"
        label={t.account.address.recipient}
        value={form.recipientName}
        onChangeText={set("recipientName")}
        autoComplete="name"
        error={errors.recipientName}
      />
      <TextField
        testID="address-line1"
        label={t.account.address.line1}
        value={form.line1}
        onChangeText={set("line1")}
        autoComplete="address-line1"
        textContentType="streetAddressLine1"
        error={errors.line1}
      />
      <TextField
        testID="address-line2"
        label={t.account.address.line2}
        value={form.line2}
        onChangeText={set("line2")}
        autoComplete="address-line2"
        textContentType="streetAddressLine2"
      />
      <View style={styles.row}>
        <View style={styles.postal}>
          <TextField
            testID="address-postal-code"
            label={t.account.address.postalCode}
            value={form.postalCode}
            onChangeText={set("postalCode")}
            keyboardType="number-pad"
            autoComplete="postal-code"
            error={errors.postalCode}
          />
        </View>
        <View style={styles.flex}>
          <TextField
            testID="address-city"
            label={t.account.address.city}
            value={form.city}
            onChangeText={set("city")}
            textContentType="addressCity"
            error={errors.city}
          />
        </View>
      </View>
      <TextField
        testID="address-phone"
        label={t.account.address.phone}
        value={form.phone}
        onChangeText={set("phone")}
        keyboardType="phone-pad"
        autoComplete="tel"
      />
    </>
  );
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
  const [errors, setErrors] = React.useState<AddressErrors>({});
  const set = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

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
      <AddressFields form={form} set={set} errors={errors} />
      {errors.form ? (
        <AppText variant="help" tone="destructive">
          {errors.form}
        </AppText>
      ) : null}
      <Button
        testID="address-save"
        label={submitLabel}
        onPress={() => void submit()}
        loading={busy}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: "row", gap: 12 },
  postal: { width: 130 },
});
