import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { AuthTabs } from "@/components/auth/AuthTabs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("signInTab") };
}

export default function Page() {
  return (
    <Suspense>
      <AuthTabs />
    </Suspense>
  );
}
