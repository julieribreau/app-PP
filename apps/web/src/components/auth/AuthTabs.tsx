"use client";

import { Tabs } from "radix-ui";
import { useTranslations } from "next-intl";

import { SignInForm } from "./SignInForm";
import { SignUpForm } from "./SignUpForm";

const tab =
  "h-11 flex-1 cursor-pointer rounded-full text-[15px] font-medium text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-[0_1px_2px_rgba(42,29,22,.12)]";

/** Onglets « Se connecter » / « Créer un compte » (flèches au clavier, RGAA 7.1). */
export function AuthTabs({ initial = "signin" }: { readonly initial?: "signin" | "signup" }) {
  const t = useTranslations("auth");
  return (
    <Tabs.Root defaultValue={initial} className="flex flex-col gap-6">
      <Tabs.List aria-label={t("tabs")} className="flex gap-1 rounded-full bg-muted p-1">
        <Tabs.Trigger value="signin" className={tab}>{t("signInTab")}</Tabs.Trigger>
        <Tabs.Trigger value="signup" className={tab}>{t("signUpTab")}</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="signin"><SignInForm /></Tabs.Content>
      <Tabs.Content value="signup"><SignUpForm /></Tabs.Content>
    </Tabs.Root>
  );
}
