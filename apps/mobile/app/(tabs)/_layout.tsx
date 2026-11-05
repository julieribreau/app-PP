import { Tabs } from "expo-router";

import { messages } from "@/lib/i18n/messages";

// Onglets : la navigation seule, les écrans vivent dans src/screens.
export default function TabsLayout() {
  const t = messages();
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: t.tabs.home }} />
      <Tabs.Screen name="settings" options={{ title: t.tabs.settings }} />
    </Tabs>
  );
}
