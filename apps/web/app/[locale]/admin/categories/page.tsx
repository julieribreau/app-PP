import { Suspense } from "react";

import { CategoriesPage } from "@/components/admin/CategoriesPage";

export default function Page() {
  return (
    <Suspense>
      <CategoriesPage />
    </Suspense>
  );
}
