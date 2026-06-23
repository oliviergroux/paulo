"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import AuthenticatedShell from "@/components/AuthenticatedShell";
import DayDivider from "@/components/DayDivider";
import EmptyState from "@/components/EmptyState";
import KpiCard from "@/components/KpiCard";
import PageHeader from "@/components/PageHeader";
import RequestCard from "@/components/RequestCard";
import RequestWorkflow from "@/components/RequestWorkflow";
import { mairieFetch } from "@/lib/api";
import {
  averageHandlingHours,
  formatDayLabel,
  formatHours,
  isMairieRequest,
} from "@/lib/format";
import { MAIRIE_SERVICES, mairieServiceOptions } from "@/lib/taxonomy";
import type { RequestItem } from "@/lib/types";

const SERVICE_OPTIONS = mairieServiceOptions();

export default function MairiePage() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [subtypeFilter, setSubtypeFilter] = useState("all");
  const [highlightedIds, setHighlightedIds] = useState<number[]>([]);
  const [selectedServices, setSelectedServices] = useState<Record<number, string>>({});
  const [quickFilters, setQuickFilters] = useState({
    today: false,
    inProgress: false,
    done: false,
    unassigned: false,
  });

  const seenIdsRef = useRef<Set<number>>(new Set());
  const isFirstLoadRef = useRef(true);

  const mairieRequests = requests.filter(isMairieRequest);

  const toggleQuickFilter = (key: keyof typeof quickFilters) => {
    setQuickFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const resetFilters = () => {
    setStatusFilter("all");
    setSubtypeFilter("all");
    setQuickFilters({
      today: false,
      inProgress: false,
      done: false,
      unassigned: false,
    });
  };

  const todayCount = mairieRequests.filter(
    (req) => formatDayLabel(req.created_at) === "Aujourd’hui"
  ).length;
  const inProgressCount = mairieRequests.filter(
    (r) => r.status === "in_progress"
  ).length;
  const doneCount = mairieRequests.filter((r) => r.status === "done").length;
  const unassignedCount = mairieRequests.filter(
    (r) => !r.assigned_service && r.status !== "done"
  ).length;
  const uniqueResidents = new Set(mairieRequests.map((r) => r.phone)).size;
  const avgHours = averageHandlingHours(mairieRequests);
  const topicCount = new Set(
    mairieRequests.map((r) => r.subtype?.trim().toLowerCase()).filter(Boolean)
  ).size;

  const filteredRequests = mairieRequests
    .filter((req) => (statusFilter === "all" ? true : req.status === statusFilter))
    .filter((req) =>
      subtypeFilter === "all" ? true : req.subtype === subtypeFilter
    )
    .filter((req) =>
      quickFilters.today ? formatDayLabel(req.created_at) === "Aujourd’hui" : true
    )
    .filter((req) =>
      quickFilters.inProgress ? req.status === "in_progress" : true
    )
    .filter((req) => (quickFilters.done ? req.status === "done" : true))
    .filter((req) =>
      quickFilters.unassigned
        ? !req.assigned_service && req.status !== "done"
        : true
    )
    .sort(
      (a, b) =>
        new Date(a.created_at + "Z").getTime() -
        new Date(b.created_at + "Z").getTime()
    );

  const groupedRequests = filteredRequests.reduce(
    (acc: Record<string, RequestItem[]>, req) => {
      const label = formatDayLabel(req.created_at);
      if (!acc[label]) acc[label] = [];
      acc[label].push(req);
      return acc;
    },
    {}
  );

  const fetchRequests = async () => {
    const res = await mairieFetch("/requests");
    const data: RequestItem[] = await res.json();
    const mairieData = data.filter(isMairieRequest);
    const currentIds = new Set(mairieData.map((req) => req.id));

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

  const markAsDone = async (id: number) => {
    await mairieFetch(`/requests/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify("done"),
    });
    fetchRequests();
  };

  const markAsInProgress = async (id: number) => {
    await mairieFetch(`/requests/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify("in_progress"),
    });
    fetchRequests();
  };

  const assignService = async (requestId: number) => {
    const service = selectedServices[requestId];
    if (!service) return;

    await mairieFetch(`/requests/${requestId}/assign-service`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service }),
    });
    fetchRequests();
  };

  const archiveRequest = async (requestId: number) => {
    await mairieFetch(`/requests/${requestId}/archive`, { method: "POST" });
    fetchRequests();
  };

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AuthenticatedShell
      activeNav="mairie"
      sidebarNote={{
        title: "Espace collectivité",
        description:
          "Demandes administratives et signalements des habitants.",
      }}
    >
      <PageHeader
        eyebrow="Vue mairie"
        title="Demandes territoriales"
        description="Signalements, informations et demandes administratives classées mairie."
        actions={
          <>
            <Link
              href="/clients"
              className="rounded-2xl bg-violet-600 text-white px-5 py-3 text-sm font-medium shadow-sm hover:bg-violet-700 transition"
            >
              Voir habitants
            </Link>
          </>
        }
      />

      <div className="mb-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Demandes du jour"
          value={todayCount}
          active={quickFilters.today}
          variant="blue"
          onClick={() => toggleQuickFilter("today")}
        />
        <KpiCard
          label="En cours"
          value={inProgressCount}
          active={quickFilters.inProgress}
          variant="orange"
          valueClassName="text-orange-600"
          onClick={() => toggleQuickFilter("inProgress")}
        />
        <KpiCard
          label="Traitées"
          value={doneCount}
          active={quickFilters.done}
          variant="emerald"
          valueClassName="text-emerald-600"
          onClick={() => toggleQuickFilter("done")}
        />
        <KpiCard
          label="Délai moyen"
          value={formatHours(avgHours)}
          variant="default"
          valueClassName="text-violet-700"
        />
      </div>

      <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-3xl border border-violet-200 bg-violet-50 p-5 shadow-sm">
          <p className="text-sm text-violet-700">Non assignées</p>
          <button
            type="button"
            onClick={() => toggleQuickFilter("unassigned")}
            className="text-left w-full"
          >
            <p className="text-3xl font-bold mt-2 text-violet-900">
              {unassignedCount}
            </p>
            <p className="text-xs text-violet-600 mt-1">
              Sans service municipal désigné
            </p>
          </button>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Habitants concernés</p>
          <p className="text-3xl font-bold mt-2 text-slate-950">
            {uniqueResidents}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Numéros uniques sur les demandes mairie
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Sujets détectés</p>
          <p className="text-3xl font-bold mt-2 text-slate-950">{topicCount}</p>
          <p className="text-xs text-slate-400 mt-1">
            Types de demandes distincts (IA)
          </p>
        </div>
      </div>

      <div className="mb-8 rounded-3xl bg-white border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row gap-3 md:items-center">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
        >
          <option value="all">Tous statuts</option>
          <option value="new">Nouveau</option>
          <option value="in_progress">En cours</option>
          <option value="done">Traité</option>
        </select>

        <select
          value={subtypeFilter}
          onChange={(e) => setSubtypeFilter(e.target.value)}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
        >
          <option value="all">Tous sujets</option>
          {MAIRIE_SERVICES.map((service) => (
            <option key={service} value={service}>
              {SERVICE_OPTIONS.find((option) => option.id === service)?.label}
            </option>
          ))}
        </select>

        <button
          onClick={resetFilters}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Réinitialiser
        </button>

        <div className="md:ml-auto text-sm text-slate-500">
          {filteredRequests.length} demande
          {filteredRequests.length > 1 ? "s" : ""} mairie affichée
          {filteredRequests.length > 1 ? "s" : ""}
        </div>
      </div>

      <div className="space-y-8">
        {Object.keys(groupedRequests).length === 0 && (
          <EmptyState message="Aucune demande mairie pour ces filtres." />
        )}

        {Object.entries(groupedRequests)
          .reverse()
          .map(([dayLabel, dayRequests]) => (
            <React.Fragment key={dayLabel}>
              <DayDivider label={dayLabel} />
              <div className="space-y-4">
                {dayRequests.map((req) => (
                  <RequestCard
                    key={req.id}
                    request={req}
                    highlighted={highlightedIds.includes(req.id)}
                    actions={
                      <RequestWorkflow
                        request={req}
                        variant="mairie"
                        assignMode="service"
                        assignOptions={SERVICE_OPTIONS}
                        selectedAssignId={
                          selectedServices[req.id] || req.subtype || ""
                        }
                        onSelectAssign={(serviceId) =>
                          setSelectedServices((prev) => ({
                            ...prev,
                            [req.id]: serviceId,
                          }))
                        }
                        onAssign={() => assignService(req.id)}
                        onTake={() => markAsInProgress(req.id)}
                        onMarkDone={() => markAsDone(req.id)}
                        onArchive={() => archiveRequest(req.id)}
                        assignLabel="Assigner à un service municipal"
                        assignedLabel="Service :"
                      />
                    }
                  />
                ))}
              </div>
            </React.Fragment>
          ))}
      </div>
    </AuthenticatedShell>
  );
}
