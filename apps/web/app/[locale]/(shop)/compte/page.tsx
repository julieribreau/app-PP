import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { AccountPage } from "@/components/account/AccountPage";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account");
  return { title: t("title") };
}

export default function ComptePage() {
  return (
    <Suspense>
      <AccountPage />
    </Suspense>
  );
}
