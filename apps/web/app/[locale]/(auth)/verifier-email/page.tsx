import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { VerifyEmailResult } from "@/components/auth/PasswordForms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("verifyEmailTitle") };
}

export default function Page() {
  return (
    <Suspense>
      <VerifyEmailResult />
    </Suspense>
  );
}
