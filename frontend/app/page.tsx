"use client";

import React, { useEffect, useState, useRef } from "react";

type Request = {
  id: number;
  phone: string;
  transcription: string;
  category: string;
  subtype: string;
  created_at: string;
  status: string;
  assigned_partner_id?: number | null;
  partner_name?: string;
  first_name?: string | null;
  last_name?: string | null;
  address?: string | null;
};

type Partner = {
  id: number;
  name: string;
  category: string;
  subtype: string;
  is_active: boolean;
};

export default function Home() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
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

  const isUrgent = (req: Request) =>
    req.category === "service_local" || req.category === "mairie";

  const formatDayLabel = (dateString: string) => {
    const date = new Date(dateString + "Z");
    const parisDate = new Date(date.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
    const nowParis = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Paris" }));

    const today = new Date(nowParis);
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(nowParis);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const target = new Date(parisDate);
    target.setHours(0, 0, 0, 0);

    if (target.getTime() === today.getTime()) return "Aujourd’hui";
    if (target.getTime() === yesterday.getTime()) return "Hier";

    return target.toLocaleDateString("fr-FR", {
      timeZone: "Europe/Paris",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const toggleQuickFilter = (key: keyof typeof quickFilters) => {
    setQuickFilters((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
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

  const urgentCount = requests.filter(isUrgent).length;
  const inProgressCount = requests.filter((r) => r.status === "in_progress").length;
  const doneCount = requests.filter((r) => r.status === "done").length;

  const filteredRequests = requests
    .filter((req) => (statusFilter === "all" ? true : req.status === statusFilter))
    .filter((req) => (categoryFilter === "all" ? true : req.category === categoryFilter))
    .filter((req) =>
      quickFilters.today ? formatDayLabel(req.created_at) === "Aujourd’hui" : true
    )
    .filter((req) => (quickFilters.urgent ? isUrgent(req) : true))
    .filter((req) => (quickFilters.inProgress ? req.status === "in_progress" : true))
    .filter((req) => (quickFilters.done ? req.status === "done" : true))
    .sort(
      (a, b) =>
        new Date(a.created_at + "Z").getTime() -
        new Date(b.created_at + "Z").getTime()
    );

  const groupedRequests = filteredRequests.reduce(
    (acc: Record<string, Request[]>, req) => {
      const label = formatDayLabel(req.created_at);
      if (!acc[label]) acc[label] = [];
      acc[label].push(req);
      return acc;
    },
    {}
  );

  const fetchRequests = async () => {
    const res = await fetch("https://paulo-backend.onrender.com/requests", {
      cache: "no-store",
    });
    const data: Request[] = await res.json();

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
        try {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch((err) => console.log("Audio blocked:", err));
        } catch (err) {
          console.log("Audio error:", err);
        }
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
    const res = await fetch("https://paulo-backend.onrender.com/partners", {
      cache: "no-store",
    });
    const data = await res.json();
    setPartners(data);
  };

  const markAsDone = async (id: number) => {
    await fetch(`https://paulo-backend.onrender.com/requests/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify("done"),
    });

    fetchRequests();
  };

  const markAsInProgress = async (id: number) => {
    await fetch(`https://paulo-backend.onrender.com/requests/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify("in_progress"),
    });

    fetchRequests();
  };

  const assignPartner = async (requestId: number) => {
    const partnerId = selectedPartners[requestId];
    if (!partnerId) return;

    await fetch(`https://paulo-backend.onrender.com/requests/${requestId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partner_id: Number(partnerId) }),
    });

    fetchRequests();
  };

  const archiveRequest = async (requestId: number) => {
    await fetch(`https://paulo-backend.onrender.com/requests/${requestId}/archive`, {
      method: "POST",
    });

    fetchRequests();
  };

  useEffect(() => {
    audioRef.current = new Audio("/notification.mp3");
    audioRef.current.preload = "auto";
  }, []);

  useEffect(() => {
    fetchRequests();
    fetchPartners();

    const interval = setInterval(() => {
      fetchRequests();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-950">
      <div className="flex min-h-screen">
        <aside className="hidden lg:flex w-72 flex-col border-r border-white/10 bg-slate-950 text-white">
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-blue-500 flex items-center justify-center font-bold">
                P
              </div>
              <div>
                <p className="font-semibold text-lg">Paulo</p>
                <p className="text-xs text-slate-400">Local request hub</p>
              </div>
            </div>
          </div>

          <nav className="px-4 space-y-2">
            <a href="/" className="block rounded-2xl bg-white/10 px-4 py-3 text-sm font-medium">
              Dashboard
            </a>
            <a
              href="/partners"
              className="block rounded-2xl px-4 py-3 text-sm font-medium text-slate-300 hover:bg-white/10"
            >
              Partenaires
            </a>
          </nav>

          <div className="mt-auto p-4">
            <div className="rounded-3xl bg-white/10 p-4">
              <p className="text-sm font-medium">Live monitoring</p>
              <p className="text-xs text-slate-400 mt-1">
                Mise à jour automatique toutes les 2 secondes.
              </p>
            </div>
          </div>
        </aside>

        <section className="flex-1 bg-[#f6f8fb]">
          <div className="max-w-7xl mx-auto px-5 md:px-8 py-8">
            <header className="mb-8">
              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
                <div>
                  <p className="text-sm font-medium text-blue-600 mb-1">
                    Centre opérationnel
                  </p>
                  <h1 className="text-4xl font-bold tracking-tight text-slate-950">
                    Demandes entrantes
                  </h1>
                  <p className="text-slate-500 mt-2">
                    Téléphone, WhatsApp, qualification IA et dispatch partenaires.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href="/partners"
                    className="rounded-2xl bg-slate-950 text-white px-5 py-3 text-sm font-medium shadow-sm hover:bg-slate-800 transition"
                  >
                    Voir partenaires
                  </a>

                  <button
                    onClick={async () => {
                      const next = !soundEnabled;
                      setSoundEnabled(next);

                      if (next && audioRef.current) {
                        try {
                          audioRef.current.currentTime = 0;
                          await audioRef.current.play();
                        } catch (err) {
                          console.log("Audio init blocked:", err);
                        }
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
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
                <button
                  onClick={() => toggleQuickFilter("today")}
                  className={`rounded-3xl border p-5 shadow-sm text-left transition ${
                    quickFilters.today
                      ? "bg-blue-50 border-blue-500 ring-2 ring-blue-100"
                      : "bg-white border-slate-200 hover:border-blue-200"
                  }`}
                >
                  <p className="text-sm text-slate-500">Demandes du jour</p>
                  <p className="text-3xl font-bold mt-2">{todayCount}</p>
                </button>

                <button
                  onClick={() => toggleQuickFilter("urgent")}
                  className={`rounded-3xl border p-5 shadow-sm text-left transition ${
                    quickFilters.urgent
                      ? "bg-red-50 border-red-500 ring-2 ring-red-100"
                      : "bg-white border-slate-200 hover:border-red-200"
                  }`}
                >
                  <p className="text-sm text-slate-500">Urgentes</p>
                  <p className="text-3xl font-bold mt-2 text-red-600">{urgentCount}</p>
                </button>

                <button
                  onClick={() => toggleQuickFilter("inProgress")}
                  className={`rounded-3xl border p-5 shadow-sm text-left transition ${
                    quickFilters.inProgress
                      ? "bg-orange-50 border-orange-500 ring-2 ring-orange-100"
                      : "bg-white border-slate-200 hover:border-orange-200"
                  }`}
                >
                  <p className="text-sm text-slate-500">En cours</p>
                  <p className="text-3xl font-bold mt-2 text-orange-600">
                    {inProgressCount}
                  </p>
                </button>

                <button
                  onClick={() => toggleQuickFilter("done")}
                  className={`rounded-3xl border p-5 shadow-sm text-left transition ${
                    quickFilters.done
                      ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-100"
                      : "bg-white border-slate-200 hover:border-emerald-200"
                  }`}
                >
                  <p className="text-sm text-slate-500">Traitées</p>
                  <p className="text-3xl font-bold mt-2 text-emerald-600">{doneCount}</p>
                </button>
              </div>

              <div className="mt-5 rounded-3xl bg-white border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row gap-3 md:items-center">
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
            </header>

            <div className="space-y-8">
              {Object.entries(groupedRequests)
                .reverse()
                .map(([dayLabel, dayRequests]) => (
                  <React.Fragment key={dayLabel}>
                    <div className="sticky top-0 z-20 bg-[#f6f8fb]/95 backdrop-blur py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-slate-200" />
                        <span
                          className={`text-sm font-semibold px-4 py-1.5 rounded-full border ${
                            dayLabel === "Aujourd’hui"
                              ? "text-white bg-slate-950 border-slate-950 shadow-sm"
                              : "text-slate-700 bg-white border-slate-200"
                          }`}
                        >
                          {dayLabel}
                        </span>
                        <div className="h-px flex-1 bg-slate-200" />
                      </div>
                    </div>

                    <div className="space-y-4">
                      {dayRequests.map((req) => (
                        <article
                          key={req.id}
                          className={`rounded-[28px] border bg-white shadow-sm transition-all ${
                            highlightedIds.includes(req.id)
                              ? "border-yellow-300 bg-yellow-50 animate-fade-in-row"
                              : "border-slate-200 hover:border-blue-200 hover:shadow-md"
                          }`}
                        >
                          <div className="p-5 md:p-6 grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
                            <div>
                              <div className="flex flex-wrap items-center gap-2 mb-4">
                                {isUrgent(req) && (
                                  <span className="text-xs font-bold bg-red-100 text-red-700 px-3 py-1 rounded-full">
                                    URGENT
                                  </span>
                                )}

                                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                                  {new Date(req.created_at + "Z").toLocaleString("fr-FR", {
                                    timeZone: "Europe/Paris",
                                  })}
                                </span>

                                <span className="text-xs font-medium text-slate-700 bg-slate-100 px-3 py-1 rounded-full">
                                  {req.phone}
                                </span>

                                <span
                                  className={`text-xs font-semibold px-3 py-1 rounded-full ${
                                    req.category === "commerce"
                                      ? "bg-blue-100 text-blue-700"
                                      : req.category === "service_local"
                                      ? "bg-orange-100 text-orange-700"
                                      : req.category === "mairie"
                                      ? "bg-violet-100 text-violet-700"
                                      : req.category === "transport"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-slate-100 text-slate-700"
                                  }`}
                                >
                                  {req.category}
                                </span>

                                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                                  {req.subtype || "autre"}
                                </span>
                              </div>

                              <p className="text-lg leading-7 text-slate-900">
                                {req.transcription}
                              </p>

                              {(req.first_name || req.last_name || req.address) && (
                                <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm">
                                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                                    Fiche client
                                  </p>

                                  {(req.first_name || req.last_name) && (
                                    <p className="text-slate-700">
                                      <span className="font-semibold text-slate-950">
                                        Nom :
                                      </span>{" "}
                                      {[req.first_name, req.last_name]
                                        .filter(Boolean)
                                        .join(" ")}
                                    </p>
                                  )}

                                  {req.address && (
                                    <p className="text-slate-700 mt-1">
                                      <span className="font-semibold text-slate-950">
                                        Adresse :
                                      </span>{" "}
                                      {req.address}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="rounded-3xl bg-slate-50 border border-slate-200 p-4">
                              {req.assigned_partner_id ? (
                                <div className="space-y-4">
                                  <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                                      Assignation
                                    </p>
                                    <a
                                      href={`/partners/${req.assigned_partner_id}`}
                                      className="text-sm font-semibold text-blue-700 underline underline-offset-2"
                                    >
                                      Assigné à {req.partner_name}
                                    </a>
                                  </div>

                                  <div className="flex flex-wrap gap-2 items-center">
                                    {req.status === "done" ? (
                                      <>
                                        <span className="text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full text-sm font-semibold">
                                          Traité
                                        </span>
                                        <button
                                          onClick={() => archiveRequest(req.id)}
                                          className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 px-4 py-2 rounded-2xl text-sm font-medium transition"
                                        >
                                          Archiver
                                        </button>
                                      </>
                                    ) : req.status === "in_progress" ? (
                                      <>
                                        <span className="text-orange-700 bg-orange-100 px-3 py-1 rounded-full text-sm font-semibold">
                                          En cours
                                        </span>
                                        <button
                                          onClick={() => markAsDone(req.id)}
                                          className="bg-slate-950 hover:bg-slate-800 text-white px-4 py-2 rounded-2xl text-sm font-medium transition"
                                        >
                                          Marquer traité
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <span className="text-slate-700 bg-white border border-slate-200 px-3 py-1 rounded-full text-sm font-semibold">
                                          Nouveau
                                        </span>
                                        <button
                                          onClick={() => markAsInProgress(req.id)}
                                          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-2xl text-sm font-medium transition"
                                        >
                                          Prendre
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                                    Assigner à un partenaire
                                  </p>

                                  <div className="space-y-3">
                                    <select
                                      value={selectedPartners[req.id] || ""}
                                      onChange={(e) =>
                                        setSelectedPartners((prev) => ({
                                          ...prev,
                                          [req.id]: e.target.value,
                                        }))
                                      }
                                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                                    >
                                      <option value="">Choisir un partenaire</option>
                                      {partners
                                        .filter((p) => {
                                          const partnerCategory = p.category
                                            ?.trim()
                                            .toLowerCase();
                                          const partnerSubtype = p.subtype
                                            ?.trim()
                                            .toLowerCase();
                                          const requestCategory = req.category
                                            ?.trim()
                                            .toLowerCase();
                                          const requestSubtype = req.subtype
                                            ?.trim()
                                            .toLowerCase();

                                          return (
                                            p.is_active &&
                                            partnerCategory === requestCategory &&
                                            (!requestSubtype ||
                                              requestSubtype === "autre" ||
                                              partnerSubtype === requestSubtype)
                                          );
                                        })
                                        .map((partner) => (
                                          <option key={partner.id} value={partner.id}>
                                            {partner.name}
                                          </option>
                                        ))}
                                    </select>

                                    <button
                                      onClick={() => assignPartner(req.id)}
                                      disabled={!selectedPartners[req.id]}
                                      className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white transition ${
                                        !selectedPartners[req.id]
                                          ? "bg-slate-300 cursor-not-allowed"
                                          : "bg-blue-600 hover:bg-blue-700 shadow-sm"
                                      }`}
                                    >
                                      Assigner la demande
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </React.Fragment>
                ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}