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

  const isUrgent = (req: Request) => {
  return req.category === "service_local" || req.category === "mairie";
};

  const seenIdsRef = useRef<Set<number>>(new Set());
  const isFirstLoadRef = useRef(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const formatDayLabel = (dateString: string) => {
    const date = new Date(dateString + "Z");
    const parisDate = new Date(
      date.toLocaleString("en-US", { timeZone: "Europe/Paris" })
    );
    const nowParis = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Europe/Paris" })
    );

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

  const filteredRequests = requests
    .filter((req) => (statusFilter === "all" ? true : req.status === statusFilter))
    .filter((req) => (categoryFilter === "all" ? true : req.category === categoryFilter))
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
          audioRef.current.play().catch((err) => {
            console.log("Audio blocked:", err);
          });
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
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify("done"),
    });

    fetchRequests();
  };

  const assignPartner = async (requestId: number) => {
    const partnerId = selectedPartners[requestId];
    if (!partnerId) return;

    await fetch(`https://paulo-backend.onrender.com/requests/${requestId}/assign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
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
    <main className="min-h-screen bg-[#f6f8fb] text-black">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Paulo — Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">
                Suivi des demandes habitants et assignation partenaires
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href="/partners"
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl shadow-sm transition"
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
                className={`px-4 py-2 rounded-xl text-white shadow-sm transition ${
                  soundEnabled
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-gray-500 hover:bg-gray-600"
                }`}
              >
                {soundEnabled ? "🔔 Son activé" : "🔕 Son désactivé"}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col md:flex-row gap-3 md:items-center">
            <select
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-xl px-3 py-2 bg-white"
            >
              <option value="all">Tous statuts</option>
              <option value="new">Nouveau</option>
              <option value="done">Traité</option>
            </select>

            <select
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border border-gray-300 rounded-xl px-3 py-2 bg-white"
            >
              <option value="all">Toutes catégories</option>
              <option value="transport">Transport</option>
              <option value="commerce">Commerce</option>
              <option value="service_local">Service local</option>
              <option value="mairie">Mairie</option>
            </select>

            <div className="md:ml-auto text-sm text-gray-500">
              Mise à jour automatique toutes les 2 secondes
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {Object.entries(groupedRequests)
            .reverse()
            .map(([dayLabel, dayRequests]) => (
              <React.Fragment key={dayLabel}>
                <div className="sticky top-0 z-10 bg-[#f6f8fb] py-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-px flex-1 ${
                        dayLabel === "Aujourd’hui" ? "bg-blue-400" : "bg-gray-300"
                      }`}
                    />
                    <span
                      className={`text-sm font-semibold px-4 py-1.5 rounded-full border ${
                        dayLabel === "Aujourd’hui"
                          ? "text-white bg-blue-600 border-blue-600 shadow-sm"
                          : "text-gray-700 bg-white border-gray-300"
                      }`}
                    >
                      {dayLabel}
                    </span>
                    <div
                      className={`h-px flex-1 ${
                        dayLabel === "Aujourd’hui" ? "bg-blue-400" : "bg-gray-300"
                      }`}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  {dayRequests.map((req) => (
                    <div
                      key={req.id}
                      className={`rounded-2xl border shadow-sm bg-white transition-all ${
                        highlightedIds.includes(req.id)
                          ? "border-yellow-300 bg-yellow-50 animate-fade-in-row"
                          : "border-gray-200 hover:border-blue-200 hover:shadow-md"
                      }`}
                    >
                      <div className="p-4 flex flex-col gap-4">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              {isUrgent(req) && (
                              <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-1 rounded-full">
                                URGENT
                              </span>
                            )}
                              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                {new Date(req.created_at + "Z").toLocaleString("fr-FR", {
                                  timeZone: "Europe/Paris",
                                })}
                              </span>

                              <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded-full">
                                {req.phone}
                              </span>

                              <span
                                className={`text-xs font-medium px-2 py-1 rounded-full ${
                                  req.category === "commerce"
                                    ? "bg-blue-100 text-blue-700"
                                    : req.category === "service_local"
                                    ? "bg-orange-100 text-orange-700"
                                    : req.category === "mairie"
                                    ? "bg-violet-100 text-violet-700"
                                    : req.category === "transport"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {req.category}
                              </span>

                              <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                                {req.subtype || "autre"}
                              </span>
                            </div>

                            <p className="text-[15px] leading-6 text-gray-900">
                              {req.transcription}
                            </p>
                          </div>

                          <div className="flex flex-col gap-3 w-full lg:w-[320px] shrink-0">
                            {req.assigned_partner_id ? (
                              <>
                                <a
                                  href={`/partners/${req.assigned_partner_id}`}
                                  className="text-sm font-medium text-blue-700 underline underline-offset-2"
                                >
                                  Assigné à {req.partner_name}
                                </a>

                                <div>
                                  {req.status === "done" ? (
  <span className="text-green-700 bg-green-100 px-3 py-1 rounded-full text-sm font-medium">
    Traité
  </span>
) : req.status === "in_progress" ? (
  <span className="text-orange-700 bg-orange-100 px-3 py-1 rounded-full text-sm font-medium">
    En cours
  </span>
) : (
  <span className="text-gray-700 bg-gray-100 px-3 py-1 rounded-full text-sm font-medium">
    Nouveau
  </span>
)} : (
                                    <button
                                      onClick={() => markAsDone(req.id)}
                                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition shadow-sm"
                                    >
                                      Marquer traité
                                    </button>
                                  )}
                                </div>
                              </>
                            ) : (
                              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3">
                                <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                                  Assignation
                                </p>

                                <div className="flex flex-col gap-2">
                                  <select
                                    value={selectedPartners[req.id] || ""}
                                    onChange={(e) =>
                                      setSelectedPartners((prev) => ({
                                        ...prev,
                                        [req.id]: e.target.value,
                                      }))
                                    }
                                    className="w-full border border-gray-300 rounded-xl px-3 py-2 bg-white"
                                  >
                                    <option value="">Choisir un partenaire</option>
                                    {partners
                                      .filter(
                                        (p) =>
                                          p.category === req.category &&
                                          (req.subtype ? p.subtype === req.subtype : true)
                                      )
                                      .map((partner) => (
                                        <option key={partner.id} value={partner.id}>
                                          {partner.name}
                                        </option>
                                      ))}
                                  </select>

                                  <button
                                    onClick={() => assignPartner(req.id)}
                                    className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl transition shadow-sm"
                                  >
                                    Assigner
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </React.Fragment>
            ))}
        </div>
      </div>
    </main>
  );
}