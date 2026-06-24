"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import AuthenticatedShell from "@/components/AuthenticatedShell";
import MairieKanbanBoard from "@/components/MairieKanbanBoard";
import MairieTopicChart from "@/components/MairieTopicChart";
import { mairieFetch } from "@/lib/api";
import {
  averageHandlingHours,
  formatDayLabel,
  formatHours,
  isMairieRequest,
} from "@/lib/format";
import {
  computeMairieTopicStats,
  countActiveMairieRequests,
  countActiveMairieTopics,
  resolveMairieTopic,
} from "@/lib/mairie-stats";
import { MAIRIE_SERVICES, mairieServiceOptions, subtypeLabel } from "@/lib/taxonomy";
import type { RequestItem } from "@/lib/types";

const SERVICE_OPTIONS = mairieServiceOptions();

export default function MairiePage() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [archivedCount, setArchivedCount] = useState(0);
  const [subtypeFilter, setSubtypeFilter] = useState("all");
  const [highlightedIds, setHighlightedIds] = useState<number[]>([]);
  const [selectedServices, setSelectedServices] = useState<Record<number, string>>({});

  const seenIdsRef = useRef<Set<number>>(new Set());
  const isFirstLoadRef = useRef(true);

  const mairieRequests = requests.filter(isMairieRequest);
  const activeRequests = mairieRequests.filter(
    (req) => req.status === "new" || req.status === "in_progress"
  );
  const topicStats = computeMairieTopicStats(mairieRequests);
  const activeMairieCount = countActiveMairieRequests(mairieRequests);

  const filteredActive = activeRequests
    .filter((req) =>
      subtypeFilter === "all" ? true : resolveMairieTopic(req) === subtypeFilter
    )
    .sort(
      (a, b) =>
        new Date(b.created_at + "Z").getTime() -
        new Date(a.created_at + "Z").getTime()
    );

  const newRequests = filteredActive.filter((req) => req.status === "new");
  const inProgressRequests = filteredActive.filter(
    (req) => req.status === "in_progress"
  );

  const todayCount = mairieRequests.filter(
    (req) => formatDayLabel(req.created_at).startsWith("Aujourd")
  ).length;
  const unassignedCount = activeRequests.filter(
    (r) => !r.assigned_service
  ).length;
  const avgHours = averageHandlingHours(mairieRequests);
  const topicCount = countActiveMairieTopics(topicStats);

  const fetchRequests = async () => {
    const [activeRes, archivedRes] = await Promise.all([
      mairieFetch("/requests"),
      mairieFetch("/requests?archived=true"),
    ]);
    const data: RequestItem[] = await activeRes.json();
    const archived: RequestItem[] = await archivedRes.json();
    const mairieData = data.filter(isMairieRequest);
    const currentIds = new Set(mairieData.map((req) => req.id));

    setArchivedCount(archived.filter(isMairieRequest).length);

    if (isFirstLoadRef.current) {
      seenIdsRef.current = currentIds;
      setRequests(data);
      isFirstLoadRef.current = false;
      return;
    }

    const trulyNew = mairieData.filter((req) => !seenIdsRef.current.has(req.id));

    if (trulyNew.length > 0) {
      const newRequestIds = trulyNew.map((req) => req.id);
      setHighlightedIds((prev) => [...new Set([...prev, ...newRequestIds])]);

      newRequestIds.forEach((id) => {
        setTimeout(() => {
          setHighlightedIds((prev) => prev.filter((x) => x !== id));
        }, 4000);
      });
    }

    seenIdsRef.current = currentIds;
    setRequests(data);
  };

  const markAsInProgress = async (id: number) => {
    await mairieFetch(`/requests/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify("in_progress"),
    });
    fetchRequests();
  };

  const markAsDone = async (id: number) => {
    await mairieFetch(`/requests/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify("done"),
    });
  };

  const archiveRequest = async (id: number) => {
    await mairieFetch(`/requests/${id}/archive`, { method: "POST" });
    fetchRequests();
  };

  const assignService = async (requestId: number) => {
    const request = requests.find((item) => item.id === requestId);
    const service =
      selectedServices[requestId] ||
      (request ? resolveMairieTopic(request) : "");
    if (!service) return;

    await mairieFetch(`/requests/${requestId}/assign-service`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service }),
    });
    fetchRequests();
  };

  const handleTopicSelect = (subtype: string) => {
    setSubtypeFilter((current) => (current === subtype ? "all" : subtype));
  };

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AuthenticatedShell
      activeNav="mairie"
      maxWidth="full"
      sidebarNote={{
        title: "Pilotage territorial",
        description: "Signalements et demandes administratives en temps réel.",
      }}
    >
      <div className="mb-8 rounded-[32px] bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-700 text-white p-6 md:p-8 shadow-lg shadow-violet-200/50">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <p className="text-violet-200 text-sm font-medium tracking-wide uppercase">
              Espace collectivité
            </p>
            <h1 className="text-3xl md:text-4xl font-bold mt-2 tracking-tight">
              Tableau de bord mairie
            </h1>
            <p className="text-violet-100/90 mt-2 max-w-xl text-sm md:text-base">
              Suivez les signalements habitants, assignez-les aux services
              municipaux et clôturez les dossiers en un clic.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 px-5 py-3 min-w-[120px]">
              <p className="text-violet-200 text-xs">Actives</p>
              <p className="text-2xl font-bold mt-1">{activeMairieCount}</p>
            </div>
            <Link
              href="/mairie/archives"
              className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 px-5 py-3 min-w-[120px] hover:bg-white/20 transition"
            >
              <p className="text-violet-200 text-xs">Archives</p>
              <p className="text-2xl font-bold mt-1">{archivedCount}</p>
            </Link>
            <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 px-5 py-3 min-w-[120px]">
              <p className="text-violet-200 text-xs">Délai moyen</p>
              <p className="text-2xl font-bold mt-1">{formatHours(avgHours)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Aujourd'hui", value: todayCount },
          { label: "Nouvelles", value: newRequests.length },
          { label: "En cours", value: inProgressRequests.length },
          { label: "Non assignées", value: unassignedCount },
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

      <div className="mb-8 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-6">
        <MairieTopicChart
          stats={topicStats}
          activeTotal={activeMairieCount}
          selectedSubtype={subtypeFilter === "all" ? undefined : subtypeFilter}
          onSelectSubtype={handleTopicSelect}
        />

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Vue d'ensemble</p>
          <p className="text-sm text-slate-500 mt-1 mb-5">
            {topicCount} service{topicCount > 1 ? "s" : ""} municipal
            {topicCount > 1 ? "aux" : ""} sollicité{topicCount > 1 ? "s" : ""}
          </p>
          <div className="space-y-3">
            {topicStats.slice(0, 5).map((row) => (
              <button
                key={row.subtype}
                type="button"
                onClick={() => handleTopicSelect(row.subtype)}
                className="w-full flex items-center justify-between rounded-xl bg-slate-50 hover:bg-violet-50 px-4 py-3 text-left transition"
              >
                <span className="text-sm font-medium text-slate-800">
                  {row.label}
                </span>
                <span className="text-sm font-bold text-violet-700">
                  {row.activeCount}
                </span>
              </button>
            ))}
            {topicStats.length === 0 && (
              <p className="text-sm text-slate-500">Aucun dossier actif.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">File de traitement</h2>
          <p className="text-sm text-slate-500">
            {filteredActive.length} dossier{filteredActive.length > 1 ? "s" : ""}{" "}
            actif{filteredActive.length > 1 ? "s" : ""}
            {subtypeFilter !== "all"
              ? ` · ${subtypeLabel(subtypeFilter)}`
              : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={subtypeFilter}
            onChange={(e) => setSubtypeFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="all">Tous les services</option>
            {MAIRIE_SERVICES.map((service) => (
              <option key={service} value={service}>
                {subtypeLabel(service)}
              </option>
            ))}
          </select>
          {subtypeFilter !== "all" && (
            <button
              type="button"
              onClick={() => setSubtypeFilter("all")}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Effacer filtre
            </button>
          )}
        </div>
      </div>

      <MairieKanbanBoard
        newRequests={newRequests}
        inProgressRequests={inProgressRequests}
        highlightedIds={highlightedIds}
        assignOptions={SERVICE_OPTIONS}
        selectedServices={selectedServices}
        onSelectService={(requestId, serviceId) =>
          setSelectedServices((prev) => ({ ...prev, [requestId]: serviceId }))
        }
        onAssign={assignService}
        onTake={markAsInProgress}
        onMarkDone={markAsDone}
        onArchive={archiveRequest}
        resolveDefaultService={resolveMairieTopic}
      />
    </AuthenticatedShell>
  );
}
