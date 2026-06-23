"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AuthenticatedShell from "@/components/AuthenticatedShell";
import CategoryBadge from "@/components/CategoryBadge";
import ClientEditForm from "@/components/ClientEditForm";
import EmptyState from "@/components/EmptyState";
import KpiCard from "@/components/KpiCard";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { useRoleFetch } from "@/components/AuthenticatedShell";
import { displayClientName, formatDate, isMairieRequest } from "@/lib/format";
import type { ClientItem, RequestItem } from "@/lib/types";

export default function ClientDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { role, loading: roleLoading, fetchApi } = useRoleFetch();

  const [client, setClient] = useState<ClientItem | null>(null);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchClient = async () => {
    const res = await fetchApi(`/clients/${id}`);
    const data = await res.json();

    if (data.client) {
      setClient(data.client);
      setRequests(Array.isArray(data.requests) ? data.requests : []);
    }
  };

  const saveClient = async (payload: {
    first_name: string | null;
    last_name: string | null;
    address: string | null;
  }) => {
    const res = await fetchApi(`/clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("save_failed");

    const data = await res.json();
    if (data.client) setClient(data.client);
  };

  useEffect(() => {
    if (!roleLoading && role) fetchClient();
  }, [id, role, roleLoading]);

  if (roleLoading || !client) {
    return (
      <AuthenticatedShell activeNav="clients">
        <p>Chargement...</p>
      </AuthenticatedShell>
    );
  }

  const visibleRequests =
    role === "mairie"
      ? requests.filter(isMairieRequest)
      : requests;

  const filteredRequests = visibleRequests.filter((req) =>
    statusFilter === "all" ? true : req.status === statusFilter
  );

  const newCount = visibleRequests.filter((r) => r.status === "new").length;
  const inProgressCount = visibleRequests.filter(
    (r) => r.status === "in_progress"
  ).length;
  const doneCount = visibleRequests.filter((r) => r.status === "done").length;

  return (
    <AuthenticatedShell activeNav="clients">
      <PageHeader
        eyebrow="Fiche client"
        title={displayClientName(client.first_name, client.last_name)}
        description="Historique et informations de l'habitant."
        actions={
          <>
            <ClientEditForm client={client} onSave={saveClient} />
            <Link
              href="/clients"
              className="rounded-2xl bg-slate-950 text-white px-5 py-3 text-sm font-semibold hover:bg-slate-800 transition"
            >
              Retour
            </Link>
          </>
        }
      />

      <div className="mb-8 bg-white border border-slate-200 rounded-[32px] shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="rounded-3xl bg-slate-50 border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400 font-bold">
              Téléphone
            </p>
            <p className="font-semibold mt-2">{client.phone}</p>
          </div>
          <div className="rounded-3xl bg-slate-50 border border-slate-200 p-4 md:col-span-2">
            <p className="text-xs uppercase tracking-wide text-slate-400 font-bold">
              Adresse
            </p>
            <p className="font-semibold mt-2">
              {client.address || "Non renseignée"}
            </p>
          </div>
          <div className="rounded-3xl bg-slate-50 border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400 font-bold">
              Créé le
            </p>
            <p className="font-semibold mt-2">{formatDate(client.created_at)}</p>
          </div>
          <div className="rounded-3xl bg-slate-50 border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400 font-bold">
              Mis à jour
            </p>
            <p className="font-semibold mt-2">{formatDate(client.updated_at)}</p>
          </div>
          <div className="rounded-3xl bg-slate-50 border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400 font-bold">
              Total demandes
            </p>
            <p className="font-semibold mt-2">{visibleRequests.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <KpiCard
          label="Toutes"
          value={visibleRequests.length}
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
          <article
            key={req.id}
            className="rounded-[28px] border border-slate-200 bg-white shadow-sm hover:border-blue-200 hover:shadow-md transition"
          >
            <div className="p-5 md:p-6">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  {formatDate(req.created_at)}
                </span>
                <CategoryBadge category={req.category} subtype={req.subtype} />
                <StatusBadge status={req.status} size="sm" />
              </div>

              <p className="text-lg leading-7 text-slate-900">{req.transcription}</p>

              {req.partner_name && (
                <p className="text-sm text-slate-500 mt-4">
                  Assigné à :{" "}
                  <span className="font-semibold text-slate-900">
                    {req.partner_name}
                  </span>
                </p>
              )}
            </div>
          </article>
        ))}

        {filteredRequests.length === 0 && (
          <EmptyState message="Aucune demande pour ce filtre." />
        )}
      </div>
    </AuthenticatedShell>
  );
}
