"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AuthenticatedShell from "@/components/AuthenticatedShell";
import AdminCategoryChart from "@/components/AdminCategoryChart";
import CategoryBadge from "@/components/CategoryBadge";
import StatusBadge from "@/components/StatusBadge";
import { adminFetch } from "@/lib/api";
import {
  computeAdminCategoryStats,
  countActivePartners,
  countActiveRequests,
  countPendingPartners,
  getPendingPartners,
  getPriorityRequests,
} from "@/lib/admin-stats";
import { formatDayLabel, isUrgentRequest } from "@/lib/format";
import type { CommuneItem, PartnerDetail, RequestItem } from "@/lib/types";

export default function AdminDashboardPage() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [partners, setPartners] = useState<PartnerDetail[]>([]);
  const [communes, setCommunes] = useState<CommuneItem[]>([]);

  const fetchData = async () => {
    const [requestsRes, partnersRes, communesRes] = await Promise.all([
      adminFetch("/requests"),
      adminFetch("/partners"),
      adminFetch("/communes"),
    ]);

    if (requestsRes.ok) setRequests(await requestsRes.json());
    if (partnersRes.ok) setPartners(await partnersRes.json());
    if (communesRes.ok) setCommunes(await communesRes.json());
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const activeCount = countActiveRequests(requests);
  const categoryStats = computeAdminCategoryStats(requests);
  const pendingPartners = getPendingPartners(partners);
  const pendingCount = countPendingPartners(partners);
  const activePartnerCount = countActivePartners(partners);
  const priorityRequests = getPriorityRequests(requests);
  const todayCount = requests.filter(
    (req) => formatDayLabel(req.created_at).startsWith("Aujourd")
  ).length;
  const newCount = requests.filter((req) => req.status === "new").length;
  const inProgressCount = requests.filter(
    (req) => req.status === "in_progress"
  ).length;
  const urgentCount = requests.filter(isUrgentRequest).length;
  const activeCommunes = communes.filter((commune) => commune.is_active).length;

  return (
    <AuthenticatedShell
      activeNav="dashboard"
      maxWidth="full"
      sidebarNote={{
        title: "Pilotage Paulo",
        description: "Vue globale de l'activité plateforme.",
      }}
    >
      <div className="mb-8 rounded-[32px] bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-white p-6 md:p-8 shadow-lg shadow-slate-300/40">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <p className="text-blue-200 text-sm font-medium tracking-wide uppercase">
              Administration Paulo
            </p>
            <h1 className="text-3xl md:text-4xl font-bold mt-2 tracking-tight">
              Tableau de bord
            </h1>
            <p className="text-slate-300/90 mt-2 max-w-xl text-sm md:text-base">
              Vue d&apos;ensemble de l&apos;activité : demandes, partenaires et
              territoires couverts.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/demandes"
              className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 px-5 py-3 min-w-[120px] hover:bg-white/20 transition"
            >
              <p className="text-blue-200 text-xs">Demandes actives</p>
              <p className="text-2xl font-bold mt-1">{activeCount}</p>
            </Link>
            <Link
              href="/partners"
              className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 px-5 py-3 min-w-[120px] hover:bg-white/20 transition"
            >
              <p className="text-blue-200 text-xs">À valider</p>
              <p className="text-2xl font-bold mt-1">{pendingCount}</p>
            </Link>
            <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 px-5 py-3 min-w-[120px]">
              <p className="text-blue-200 text-xs">Communes actives</p>
              <p className="text-2xl font-bold mt-1">{activeCommunes}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Aujourd'hui", value: todayCount },
          { label: "Nouvelles", value: newCount },
          { label: "En cours", value: inProgressCount },
          { label: "Urgentes", value: urgentCount },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
          >
            <p className="text-xs font-medium text-slate-500">{kpi.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-8 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6">
        <AdminCategoryChart stats={categoryStats} activeTotal={activeCount} />

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <p className="text-sm font-semibold text-slate-900">Réseau partenaires</p>
              <p className="text-sm text-slate-500 mt-1">
                {activePartnerCount} validé{activePartnerCount > 1 ? "s" : ""}
                {pendingCount > 0
                  ? ` · ${pendingCount} en attente de validation`
                  : ""}
              </p>
            </div>
            <Link
              href="/partners"
              className="rounded-xl bg-orange-600 text-white px-4 py-2 text-sm font-semibold hover:bg-orange-700 transition shrink-0"
            >
              Valider
            </Link>
          </div>

          {pendingPartners.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
              <p className="text-sm font-medium text-slate-700">
                Aucun partenaire en attente
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Les nouvelles inscriptions apparaîtront ici.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingPartners.map((partner) => (
                <Link
                  key={partner.id}
                  href="/partners"
                  className="block rounded-2xl border border-orange-200 bg-orange-50/60 hover:bg-orange-50 px-4 py-3 transition"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{partner.name}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {partner.commune_name || "Commune non renseignée"}
                      </p>
                    </div>
                    <CategoryBadge
                      category={partner.category}
                      subtype={partner.subtype}
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">À traiter en priorité</h2>
          <p className="text-sm text-slate-500">
            {priorityRequests.length} demande
            {priorityRequests.length > 1 ? "s" : ""} nécessitant une action
          </p>
        </div>
        <Link
          href="/demandes"
          className="rounded-xl bg-slate-950 text-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-800 transition"
        >
          Ouvrir la file opérationnelle
        </Link>
      </div>

      <div className="space-y-3">
        {priorityRequests.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
            <p className="text-sm font-medium text-slate-700">
              Aucune demande en attente
            </p>
          </div>
        ) : (
          priorityRequests.map((req) => (
            <Link
              key={req.id}
              href="/demandes"
              className="block rounded-2xl border border-slate-200 bg-white hover:border-blue-200 px-5 py-4 shadow-sm transition"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <StatusBadge status={req.status} />
                    <CategoryBadge category={req.category} subtype={req.subtype} />
                    {isUrgentRequest(req) && (
                      <span className="text-xs font-bold px-2 py-1 rounded-full bg-red-100 text-red-700">
                        URGENT
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-800 line-clamp-2">
                    {req.transcription}
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    {formatDayLabel(req.created_at)}
                    {req.commune_name ? ` · ${req.commune_name}` : ""}
                  </p>
                </div>
                <span className="text-sm font-semibold text-blue-700 shrink-0">
                  Traiter →
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </AuthenticatedShell>
  );
}
