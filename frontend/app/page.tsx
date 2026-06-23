"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import DayDivider from "@/components/DayDivider";
import KpiCard from "@/components/KpiCard";
import PageHeader from "@/components/PageHeader";
import RequestActionsAdmin from "@/components/RequestActionsAdmin";
import RequestCard from "@/components/RequestCard";
import { adminFetch } from "@/lib/api";
import { formatDayLabel, isUrgentRequest } from "@/lib/format";
import type { PartnerSummary, RequestItem } from "@/lib/types";

export default function Home() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [partners, setPartners] = useState<PartnerSummary[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [highlightedIds, setHighlightedIds] = useState<number[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [selectedPartners, setSelectedPartners] = useState<Record<number, string>>({});
  const [quickFilters, setQuickFilters] = useState({
    today: false,
    urgent: false,
    inProgress: false,
    done: false,
  });

  const seenIdsRef = useRef<Set<number>>(new Set());
  const isFirstLoadRef = useRef(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggleQuickFilter = (key: keyof typeof quickFilters) => {
    setQuickFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const resetFilters = () => {
    setStatusFilter("all");
    setCategoryFilter("all");
    setQuickFilters({
      today: false,
      urgent: false,
      inProgress: false,
      done: false,
    });
  };

  const todayCount = requests.filter(
    (req) => formatDayLabel(req.created_at) === "Aujourd’hui"
  ).length;
  const urgentCount = requests.filter(isUrgentRequest).length;
  const inProgressCount = requests.filter((r) => r.status === "in_progress").length;
  const doneCount = requests.filter((r) => r.status === "done").length;

  const filteredRequests = requests
    .filter((req) => (statusFilter === "all" ? true : req.status === statusFilter))
    .filter((req) => (categoryFilter === "all" ? true : req.category === categoryFilter))
    .filter((req) =>
      quickFilters.today ? formatDayLabel(req.created_at) === "Aujourd’hui" : true
    )
    .filter((req) => (quickFilters.urgent ? isUrgentRequest(req) : true))
    .filter((req) => (quickFilters.inProgress ? req.status === "in_progress" : true))
    .filter((req) => (quickFilters.done ? req.status === "done" : true))
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
    const res = await adminFetch("/requests");
    const data: RequestItem[] = await res.json();
    const currentIds = new Set(data.map((req) => req.id));

    if (isFirstLoadRef.current) {
      seenIdsRef.current = currentIds;
      setRequests(data);
      isFirstLoadRef.current = false;
      return;
    }

    const trulyNew = data.filter((req) => !seenIdsRef.current.has(req.id));

    if (trulyNew.length > 0) {
      const newRequestIds = trulyNew.map((req) => req.id);
      setHighlightedIds((prev) => [...new Set([...prev, ...newRequestIds])]);

      if (soundEnabled && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }

      newRequestIds.forEach((id) => {
        setTimeout(() => {
          setHighlightedIds((prev) => prev.filter((x) => x !== id));
        }, 4000);
      });
    }

    seenIdsRef.current = currentIds;
    setRequests(data);
  };

  const fetchPartners = async () => {
    const res = await adminFetch("/partners");
    setPartners(await res.json());
  };

  const markAsDone = async (id: number) => {
    await adminFetch(`/requests/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify("done"),
    });
    fetchRequests();
  };

  const markAsInProgress = async (id: number) => {
    await adminFetch(`/requests/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify("in_progress"),
    });
    fetchRequests();
  };

  const assignPartner = async (requestId: number) => {
    const partnerId = selectedPartners[requestId];
    if (!partnerId) return;

    await adminFetch(`/requests/${requestId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partner_id: Number(partnerId) }),
    });
    fetchRequests();
  };

  const archiveRequest = async (requestId: number) => {
    await adminFetch(`/requests/${requestId}/archive`, { method: "POST" });
    fetchRequests();
  };

  useEffect(() => {
    audioRef.current = new Audio("/notification.mp3");
    audioRef.current.preload = "auto";
  }, []);

  useEffect(() => {
    fetchRequests();
    fetchPartners();
    const interval = setInterval(fetchRequests, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AppShell
      activeNav="dashboard"
      sidebarNote={{
        title: "Live monitoring",
        description: "Mise à jour automatique toutes les 2 secondes.",
      }}
    >
      <PageHeader
        eyebrow="Centre opérationnel"
        title="Demandes entrantes"
        description="Téléphone, WhatsApp, qualification IA et dispatch partenaires."
        actions={
          <>
            <Link
              href="/partners"
              className="rounded-2xl bg-slate-950 text-white px-5 py-3 text-sm font-medium shadow-sm hover:bg-slate-800 transition"
            >
              Voir partenaires
            </Link>
            <button
              onClick={async () => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                if (next && audioRef.current) {
                  audioRef.current.currentTime = 0;
                  await audioRef.current.play().catch(() => {});
                }
              }}
              className={`rounded-2xl px-5 py-3 text-sm font-medium shadow-sm transition ${
                soundEnabled
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              {soundEnabled ? "🔔 Son activé" : "🔕 Son désactivé"}
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <KpiCard
          label="Demandes du jour"
          value={todayCount}
          active={quickFilters.today}
          variant="blue"
          onClick={() => toggleQuickFilter("today")}
        />
        <KpiCard
          label="Urgentes"
          value={urgentCount}
          active={quickFilters.urgent}
          variant="red"
          valueClassName="text-red-600"
          onClick={() => toggleQuickFilter("urgent")}
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
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
        >
          <option value="all">Toutes catégories</option>
          <option value="transport">Transport</option>
          <option value="commerce">Commerce</option>
          <option value="service_local">Service local</option>
          <option value="mairie">Mairie</option>
        </select>

        <button
          onClick={resetFilters}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Réinitialiser
        </button>

        <div className="md:ml-auto text-sm text-slate-500">
          {filteredRequests.length} demande
          {filteredRequests.length > 1 ? "s" : ""} affichée
          {filteredRequests.length > 1 ? "s" : ""}
        </div>
      </div>

      <div className="space-y-8">
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
                      <RequestActionsAdmin
                        request={req}
                        partners={partners}
                        selectedPartnerId={selectedPartners[req.id]}
                        onSelectPartner={(partnerId) =>
                          setSelectedPartners((prev) => ({
                            ...prev,
                            [req.id]: partnerId,
                          }))
                        }
                        onAssign={() => assignPartner(req.id)}
                        onTake={() => markAsInProgress(req.id)}
                        onMarkDone={() => markAsDone(req.id)}
                        onArchive={() => archiveRequest(req.id)}
                      />
                    }
                  />
                ))}
              </div>
            </React.Fragment>
          ))}
      </div>
    </AppShell>
  );
}
