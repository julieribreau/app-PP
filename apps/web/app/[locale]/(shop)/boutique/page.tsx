import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { ShopPage } from "@/components/shop/ShopPage";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("shop");
  return { title: t("title") };
}

export default function BoutiquePage() {
  return (
    <Suspense>
      <ShopPage />
    </Suspense>
  );
}
