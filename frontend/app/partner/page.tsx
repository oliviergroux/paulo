import { Suspense } from "react";
import PartnerDashboardClient from "./PartnerDashboardClient";

export default function PartnerPage() {
  return (
    <Suspense fallback={<div className="p-8">Chargement...</div>}>
      <PartnerDashboardClient />
    </Suspense>
  );
}