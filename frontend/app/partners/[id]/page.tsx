"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AuthenticatedShell from "@/components/AuthenticatedShell";
import CategoryBadge from "@/components/CategoryBadge";
import EmptyState from "@/components/EmptyState";
import KpiCard from "@/components/KpiCard";
import PageHeader from "@/components/PageHeader";
import PartnerEditForm from "@/components/PartnerEditForm";
import RequestCard from "@/components/RequestCard";
import StatusBadge from "@/components/StatusBadge";
import { adminFetch } from "@/lib/api";
import { formatDate, phoneTypeClass, phoneTypeLabel } from "@/lib/format";
import type { PartnerDetail, RequestItem } from "@/lib/types";

export default function PartnerDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [partner, setPartner] = useState<PartnerDetail | null>(null);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchPartner = async () => {
    const res = await adminFetch(`/partners/${id}`);
    setPartner(await res.json());
  };

  const fetchRequests = async () => {
    const res = await adminFetch(`/partners/${id}/requests`);
    const data = await res.json();
    if (Array.isArray(data)) setRequests(data);
  };

  const savePartner = async (payload: {
    name: string;
    siret: string;
    phone: string;
    address: string;
    category: string;
    subtype: string;
    commune_id?: number | null;
  }) => {
    const res = await adminFetch(`/partners/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("save_failed");

    const data = await res.json();
    if (data.partner) setPartner(data.partner);
  };

  useEffect(() => {
    fetchPartner();
    fetchRequests();
  }, [id]);

  if (!partner) {
    return (
      <AuthenticatedShell activeNav="partners">
        <p>Chargement...</p>
      </AuthenticatedShell>
    );
  }

  const filteredRequests = requests.filter((req) =>
    statusFilter === "all" ? true : req.status === statusFilter
  );

  const newCount = requests.filter((r) => r.status === "new").length;
  const inProgressCount = requests.filter((r) => r.status === "in_progress").length;
  const doneCount = requests.filter((r) => r.status === "done").length;

  return (
    <AuthenticatedShell activeNav="partners">
      <PageHeader
        eyebrow="Fiche partenaire"
        title={partner.name}
        description="Vue admin du partenaire et de ses demandes assignées."
        actions={
          <>
            <PartnerEditForm partner={partner} onSave={savePartner} />
            <Link
              href="/partners"
              className="rounded-2xl bg-slate-950 text-white px-5 py-3 text-sm font-semibold hover:bg-slate-800 transition"
            >
              Retour partenaires
            </Link>
            <Link
              href={`/partner?partner_id=${partner.id}&token=${partner.access_token || ""}`}
              className="rounded-2xl bg-blue-600 text-white px-5 py-3 text-sm font-semibold hover:bg-blue-700 transition"
            >
              Vue partenaire
            </Link>
          </>
        }
      />

      <div className="mb-8 bg-white border border-slate-200 rounded-[32px] shadow-sm p-6">
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full ${
              partner.is_active
                ? "bg-emerald-100 text-emerald-700"
                : "bg-orange-100 text-orange-700"
            }`}
          >
            {partner.is_active ? "VALIDÉ" : "À VALIDER"}
          </span>
          <CategoryBadge category={partner.category} subtype={partner.subtype} />
          <span
            className={`text-xs font-semibold px-3 py-1 rounded-full ${phoneTypeClass(
              partner.phone_type
            )}`}
          >
            {phoneTypeLabel(partner.phone_type)}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-sm">
          <div className="rounded-3xl bg-slate-50 border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400 font-bold">
              Téléphone
            </p>
            <p className="font-semibold text-slate-900 mt-2">
              {partner.phone || "Non renseigné"}
            </p>
          </div>
          <div className="rounded-3xl bg-slate-50 border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400 font-bold">
              SIRET
            </p>
            <p className="font-semibold text-slate-900 mt-2">
              {partner.siret || "Non renseigné"}
            </p>
          </div>
          <div className="rounded-3xl bg-slate-50 border border-slate-200 p-4 xl:col-span-2">
            <p className="text-xs uppercase tracking-wide text-slate-400 font-bold">
              Adresse
            </p>
            <p className="font-semibold text-slate-900 mt-2">
              {partner.address || "Non renseignée"}
            </p>
          </div>
        </div>
      </div>

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
              <>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Statut
                </p>
                <StatusBadge status={req.status} />
                {req.handled_at && (
                  <p className="text-xs text-slate-500 mt-3">
                    Traité le {formatDate(req.handled_at)}
                  </p>
                )}
              </>
            }
          />
        ))}

        {filteredRequests.length === 0 && (
          <EmptyState message="Aucune demande pour ce filtre." />
        )}
      </div>
    </AuthenticatedShell>
  );
}
