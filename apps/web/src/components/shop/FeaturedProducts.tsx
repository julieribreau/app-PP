"use client";

import { useQuery } from "@tanstack/react-query";

import { Loading } from "@/components/ui/spinner";
import { useApi } from "@/providers/ApiProvider";

import { ProductCard } from "./ProductCard";

/** Les trois premiers produits de la boutique (ordre du back-office), sur la vitrine. */
export function FeaturedProducts() {
  const api = useApi();
  const { data, isPending } = useQuery({
    queryKey: ["catalog", "products", { pageSize: 3 }],
    queryFn: () => api.catalog.products({ pageSize: 3 }),
  });
  if (isPending) return <Loading />;
  if (!data?.items.length) return null;
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-6">
      {data.items.map((product) => (
        <ProductCard key={product.id} product={product} headingLevel={3} />
      ))}
    </div>
  );
}
