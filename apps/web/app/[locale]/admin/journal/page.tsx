import { Suspense } from "react";

import { AuditPage } from "@/components/admin/AuditPage";

export default function Page() {
  return (
    <Suspense>
      <AuditPage />
    </Suspense>
  );
}
