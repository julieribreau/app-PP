import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { CartPage } from "@/components/cart/CartPage";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("cart");
  return { title: t("title") };
}

export default function PanierPage() {
  return <CartPage />;
}
