import { Suspense } from "react";
import PartnerDashboardClient from "./PartnerDashboardClient";

export const dynamic = "force-dynamic";

export default function PartnerPage() {
  return (
    <Suspense fallback={<div className="p-8">Chargement...</div>}>
      <PartnerDashboardClient />
    </Suspense>
  );
}