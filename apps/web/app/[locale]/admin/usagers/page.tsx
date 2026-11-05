import { Suspense } from "react";

import { UsersPage } from "@/components/admin/UsersPage";

export default function Page() {
  return (
    <Suspense>
      <UsersPage />
    </Suspense>
  );
}
