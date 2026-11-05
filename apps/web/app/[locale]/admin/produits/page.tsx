import { Suspense } from "react";

import { ProductsPage } from "@/components/admin/ProductsPage";

export default function Page() {
  return (
    <Suspense>
      <ProductsPage />
    </Suspense>
  );
}
