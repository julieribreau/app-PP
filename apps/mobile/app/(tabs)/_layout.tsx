import { Tabs } from "expo-router";

import { Icon } from "@/components/ui/Icon";
import { useCart } from "@/hooks/cart/useCart";
import { useI18n } from "@/lib/i18n/useI18n";
import { useTheme } from "@/theme/useTheme";

// Onglets Boutique / Panier / Compte (canvas) : la navigation seule, les écrans vivent dans src/.
export default function TabsLayout() {
  const { t, f } = useI18n();
  const { color } = useTheme();
  const count = useCart().data?.itemCount ?? 0;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.primary,
        tabBarInactiveTintColor: color.mutedForeground,
        tabBarStyle: { backgroundColor: color.card, borderTopColor: color.border },
        tabBarLabelStyle: { fontFamily: "DMSans_500Medium", fontSize: 11 },
        tabBarBadgeStyle: { backgroundColor: color.primary, color: color.primaryForeground, fontFamily: "DMSans_600SemiBold", fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t.mobile.tabs.shop, tabBarIcon: ({ color: tint }) => <Icon name="home" color={String(tint)} size={24} /> }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: t.mobile.tabs.cart,
          tabBarBadge: count > 0 ? count : undefined,
          tabBarAccessibilityLabel: count > 0 ? f(t.nav.cartCount, { count }) : t.mobile.tabs.cart,
          tabBarIcon: ({ color: tint }) => <Icon name="bag" color={String(tint)} size={24} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{ title: t.mobile.tabs.account, tabBarIcon: ({ color: tint }) => <Icon name="user" color={String(tint)} size={24} /> }}
      />
    </Tabs>
  );
}
