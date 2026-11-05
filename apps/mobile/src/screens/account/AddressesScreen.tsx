import { router } from "expo-router";
import * as React from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";

import { EmptyState, ErrorState, Loading, Screen } from "@/components/layout/Screen";
import { AppText } from "@/components/ui/AppText";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAddresses, useDefaultAddress, useDeleteAddress } from "@/hooks/account/useAccount";
import { useI18n } from "@/lib/i18n/useI18n";
import { addressRoute } from "@/lib/routes";
import { useTheme } from "@/theme/useTheme";
import type { Address } from "@/types/api";

// Adresses de livraison : liste (par défaut en tête), défaut, suppression ; le formulaire de
// création et de modification vit dans AddressFormScreen.

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
    <Screen
      edges={["bottom"]}
      onRefresh={() => void addresses.refetch()}
      refreshing={addresses.isRefetching}
    >
      {addresses.isLoading ? (
        <Loading />
      ) : addresses.isError ? (
        <ErrorState onRetry={() => void addresses.refetch()} />
      ) : (addresses.data ?? []).length === 0 ? (
        <EmptyState message={t.mobile.account.noAddress} />
      ) : (
        [...(addresses.data ?? [])]
          .sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
          .map((address, index) => (
            <View
              key={address.id}
              testID={`address-${index}`}
              style={[styles.card, { backgroundColor: color.card, borderColor: color.border }]}
            >
              <View style={styles.cardHead}>
                <AppText variant="bodyStrong">{address.label || address.recipientName}</AppText>
                {address.isDefault ? (
                  <Badge label={t.account.address.default} tone="success" />
                ) : null}
              </View>
              <AppText variant="help">
                {[
                  address.recipientName,
                  address.line1,
                  address.line2,
                  `${address.postalCode} ${address.city}`,
                ]
                  .filter(Boolean)
                  .join("\n")}
              </AppText>
              <View style={styles.actions}>
                <ActionLink
                  testID={`address-${index}-edit`}
                  label={t.common.edit}
                  onPress={() => router.push(addressRoute(address.id))}
                />
                {address.isDefault ? null : (
                  <ActionLink
                    testID={`address-${index}-default`}
                    label={t.account.address.makeDefault}
                    onPress={() => makeDefault.mutate(address.id)}
                  />
                )}
                <ActionLink
                  testID={`address-${index}-delete`}
                  label={t.common.delete}
                  destructive
                  onPress={() => confirmDelete(address)}
                />
              </View>
            </View>
          ))
      )}
      <Button
        testID="address-add"
        label={t.account.addAddress}
        variant="outline"
        onPress={() => router.push(addressRoute("new"))}
      />
    </Screen>
  );
}

function ActionLink({
  testID,
  label,
  onPress,
  destructive,
}: {
  testID: string;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={8}
      style={styles.actionHit}
    >
      <AppText
        variant="label"
        tone={destructive ? "destructive" : "default"}
        style={styles.underline}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 6 },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginTop: 4 },
  actionHit: { minHeight: 44, justifyContent: "center" },
  underline: { textDecorationLine: "underline" },
});
