import { Stack, useLocalSearchParams } from "expo-router";

import { useI18n } from "@/lib/i18n/useI18n";
import { AddressFormScreen } from "@/screens/account/AddressesScreen";

export default function AddressRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();
  const isNew = id === "new";
  return (
    <>
      <Stack.Screen options={{ title: isNew ? t.mobile.account.newAddress : t.mobile.account.editAddress }} />
      <AddressFormScreen id={String(id ?? "new")} />
    </>
  );
}
