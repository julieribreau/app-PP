import { useLocalSearchParams } from "expo-router";

import { ProductScreen } from "@/screens/shop/ProductScreen";

export default function ProductRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return <ProductScreen slug={String(slug ?? "")} />;
}
