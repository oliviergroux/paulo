"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import EmptyState from "@/components/EmptyState";
import KpiCard from "@/components/KpiCard";
import PageHeader from "@/components/PageHeader";
import RequestWorkflow from "@/components/RequestWorkflow";
import RequestCard from "@/components/RequestCard";
import { partnerFetch } from "@/lib/api";
import type { PartnerSummary, RequestItem } from "@/lib/types";

export default function PartnerDashboardClient() {
  const searchParams = useSearchParams();
  const partnerId = searchParams.get("partner_id");
  const token = searchParams.get("token");

  const [partner, setPartner] = useState<PartnerSummary | null>(null);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchPartner = async () => {
    if (!partnerId || !token) return;
    const res = await partnerFetch(`/partners/${partnerId}`, token, partnerId);
    setPartner(await res.json());
  };

  const fetchRequests = async () => {
    if (!partnerId || !token) return;
    const res = await partnerFetch(
      `/partners/${partnerId}/requests`,
      token,
      partnerId
    );
    const data = await res.json();
    if (Array.isArray(data)) setRequests(data);
  };

  const markAsInProgress = async (id: number) => {
    if (!partnerId || !token) return;
    await partnerFetch(`/requests/${id}/status`, token, partnerId, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify("in_progress"),
    });
    fetchRequests();
  };

  const markAsDone = async (id: number) => {
    if (!partnerId || !token) return;
    await partnerFetch(`/requests/${id}/status`, token, partnerId, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify("done"),
    });
    fetchRequests();
  };

  useEffect(() => {
    fetchPartner();
    fetchRequests();
    const interval = setInterval(fetchRequests, 3000);
    return () => clearInterval(interval);
  }, [partnerId, token]);

  if (!partnerId) {
    return (
      <main className="min-h-screen bg-[#f6f8fb] p-8 text-slate-950">
        <p>Partner ID manquant.</p>
      </main>
    );
  }

  if (!partner) {
    return (
      <main className="min-h-screen bg-[#f6f8fb] p-8 text-slate-950">
        <p>Chargement...</p>
      </main>
    );
  }

  const filteredRequests = requests.filter((req) =>
    statusFilter === "all" ? true : req.status === statusFilter
  );

  const newCount = requests.filter((r) => r.status === "new").length;
  const inProgressCount = requests.filter((r) => r.status === "in_progress").length;
  const doneCount = requests.filter((r) => r.status === "done").length;

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <PageHeader
          eyebrow="Espace partenaire"
          title={`Dashboard — ${partner.name}`}
          description={`${partner.category} / ${partner.subtype}`}
          actions={
            <span
              className={`px-4 py-2 rounded-full text-sm font-semibold ${
                partner.is_active
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-orange-100 text-orange-700"
              }`}
            >
              {partner.is_active ? "Actif" : "Validation en cours"}
            </span>
          }
        />

        {!partner.is_active && (
          <div className="mb-8 bg-orange-50 border border-orange-200 rounded-3xl p-5">
            <p className="font-semibold text-orange-800">
              ⏳ Validation en cours
            </p>
            <p className="text-sm text-orange-700 mt-2 leading-6">
              Votre profil est bien créé mais doit encore être validé par Paulo.
              Vous pouvez consulter votre espace, mais vous ne recevrez pas encore
              de demandes.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <KpiCard
            label="Toutes"
            value={requests.length}
            active={statusFilter === "all"}
            variant="blue"
            onClick={() => setStatusFilter("all")}
          />
          <KpiCard
            label="Nouvelles"
            value={newCount}
            active={statusFilter === "new"}
            variant="slate"
            onClick={() => setStatusFilter("new")}
          />
          <KpiCard
            label="En cours"
            value={inProgressCount}
            active={statusFilter === "in_progress"}
            variant="orange"
            valueClassName="text-orange-600"
            onClick={() => setStatusFilter("in_progress")}
          />
          <KpiCard
            label="Traitées"
            value={doneCount}
            active={statusFilter === "done"}
            variant="emerald"
            valueClassName="text-emerald-600"
            onClick={() => setStatusFilter("done")}
          />
        </div>

        <div className="space-y-4">
          {filteredRequests.map((req) => (
            <RequestCard
              key={req.id}
              request={req}
              actionsWidth="narrow"
              actions={
                <RequestWorkflow
                  request={req}
                  variant="admin"
                  assignOptions={[]}
                  onSelectAssign={() => {}}
                  onAssign={() => {}}
                  onTake={() => markAsInProgress(req.id)}
                  onMarkDone={() => markAsDone(req.id)}
                  onArchive={() => {}}
                  showAssign={false}
                  showArchive={false}
                />
              }
            />
          ))}

          {filteredRequests.length === 0 && (
            <EmptyState message="Aucune demande pour ce filtre." />
          )}
        </div>
      </div>
    </main>
  );
}
