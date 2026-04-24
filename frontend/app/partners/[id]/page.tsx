"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Partner = {
  id: number;
  name: string;
  category: string;
  subtype: string;
  is_active: boolean;
  created_at?: string;
};

type RequestItem = {
  id: number;
  phone: string;
  transcription: string;
  category: string;
  subtype: string;
  status: string;
  created_at: string;
  handled_at?: string | null;
};

export default function PartnerDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [partner, setPartner] = useState<Partner | null>(null);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");

  const isUrgent = (req: RequestItem) => {
    return req.category === "service_local" || req.category === "mairie";
  };

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

  const fetchPartner = async () => {
    const res = await fetch(`https://paulo-backend.onrender.com/partners/${id}`, {
      cache: "no-store",
    });
    const data = await res.json();
    setPartner(data);
  };

  const fetchPartnerRequests = async () => {
    const res = await fetch(`https://paulo-backend.onrender.com/partners/${id}/requests`, {
      cache: "no-store",
    });
    const data = await res.json();
    setRequests(data);
  };

  useEffect(() => {
    fetchPartner();
    fetchPartnerRequests();
  }, [id]);

  if (!partner) {
    return (
      <main className="min-h-screen bg-[#f6f8fb] text-black p-8">
        <p>Chargement...</p>
      </main>
    );
  }

  const filteredRequests = requests.filter((req) =>
    statusFilter === "all" ? true : req.status === statusFilter
  );

  const sortedRequests = [...filteredRequests].sort(
    (a, b) =>
      new Date(a.created_at + "Z").getTime() -
      new Date(b.created_at + "Z").getTime()
  );

  const groupedRequests = sortedRequests.reduce(
    (acc: Record<string, RequestItem[]>, req) => {
      const label = formatDayLabel(req.created_at);
      if (!acc[label]) acc[label] = [];
      acc[label].push(req);
      return acc;
    },
    {}
  );

  const newCount = requests.filter((r) => r.status === "new").length;
  const inProgressCount = requests.filter((r) => r.status === "in_progress").length;
  const doneCount = requests.filter((r) => r.status === "done").length;

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-black">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Fiche partenaire — {partner.name}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Vue détaillée du partenaire et de ses demandes assignées
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/partners" className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl shadow-sm transition">
                Retour partenaires
              </Link>

              <Link href="/" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl shadow-sm transition">
                Retour demandes
              </Link>

              <Link href={`/partner?partner_id=${partner.id}`} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl shadow-sm transition">
                Vue partenaire
              </Link>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-lg font-semibold text-gray-900">{partner.name}</span>

              <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${
                  partner.category === "commerce"
                    ? "bg-blue-100 text-blue-700"
                    : partner.category === "service_local"
                    ? "bg-orange-100 text-orange-700"
                    : partner.category === "transport"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {partner.category}
              </span>

              <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                {partner.subtype}
              </span>

              {partner.is_active ? (
                <span className="text-xs font-medium bg-green-100 text-green-700 px-2 py-1 rounded-full">
                  Actif
                </span>
              ) : (
                <span className="text-xs font-medium bg-red-100 text-red-700 px-2 py-1 rounded-full">
                  Inactif
                </span>
              )}
            </div>

            <p className="text-sm text-gray-500">Identifiant partenaire : #{partner.id}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <button
              onClick={() => setStatusFilter("all")}
              className={`bg-white border rounded-2xl p-4 shadow-sm text-left transition ${
                statusFilter === "all" ? "border-blue-500 ring-2 ring-blue-100" : "border-gray-200"
              }`}
            >
              <p className="text-sm text-gray-500">Toutes les demandes</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{requests.length}</p>
            </button>

            <button
              onClick={() => setStatusFilter(statusFilter === "new" ? "all" : "new")}
              className={`bg-white border rounded-2xl p-4 shadow-sm text-left transition ${
                statusFilter === "new" ? "border-blue-500 ring-2 ring-blue-100" : "border-gray-200"
              }`}
            >
              <p className="text-sm text-gray-500">Nouvelles demandes</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{newCount}</p>
            </button>

            <button
              onClick={() =>
                setStatusFilter(statusFilter === "in_progress" ? "all" : "in_progress")
              }
              className={`bg-white border rounded-2xl p-4 shadow-sm text-left transition ${
                statusFilter === "in_progress"
                  ? "border-orange-500 ring-2 ring-orange-100"
                  : "border-gray-200"
              }`}
            >
              <p className="text-sm text-gray-500">En cours</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">
                {inProgressCount}
              </p>
            </button>

            <button
              onClick={() => setStatusFilter(statusFilter === "done" ? "all" : "done")}
              className={`bg-white border rounded-2xl p-4 shadow-sm text-left transition ${
                statusFilter === "done"
                  ? "border-green-500 ring-2 ring-green-100"
                  : "border-gray-200"
              }`}
            >
              <p className="text-sm text-gray-500">Traitées</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{doneCount}</p>
            </button>
          </div>
        </div>

        <div className="space-y-8">
          {Object.entries(groupedRequests)
            .reverse()
            .map(([dayLabel, dayRequests]) => (
              <React.Fragment key={dayLabel}>
                <div className="sticky top-0 z-10 bg-[#f6f8fb] py-2">
                  <div className="flex items-center gap-3">
                    <div className={`h-px flex-1 ${dayLabel === "Aujourd’hui" ? "bg-blue-400" : "bg-gray-300"}`} />
                    <span
                      className={`text-sm font-semibold px-4 py-1.5 rounded-full border ${
                        dayLabel === "Aujourd’hui"
                          ? "text-white bg-blue-600 border-blue-600 shadow-sm"
                          : "text-gray-700 bg-white border-gray-300"
                      }`}
                    >
                      {dayLabel}
                    </span>
                    <div className={`h-px flex-1 ${dayLabel === "Aujourd’hui" ? "bg-blue-400" : "bg-gray-300"}`} />
                  </div>
                </div>

                <div className="space-y-3">
                  {dayRequests.map((req) => (
                    <div
                      key={req.id}
                      className="rounded-2xl border border-gray-200 shadow-sm bg-white hover:border-blue-200 hover:shadow-md transition-all"
                    >
                      <div className="p-4 flex flex-col gap-4">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                {new Date(req.created_at + "Z").toLocaleString("fr-FR", {
                                  timeZone: "Europe/Paris",
                                })}
                              </span>

                              <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded-full">
                                {req.phone}
                              </span>

                              {isUrgent(req) && (
                                <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-1 rounded-full">
                                  URGENT
                                </span>
                              )}

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

                          <div className="w-full lg:w-[240px] shrink-0">
                            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3">
                              <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                                Statut
                              </p>

                              <div className="flex flex-wrap gap-2 items-center">
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
                                )}
                              </div>

                              {req.handled_at && (
                                <p className="text-xs text-gray-500 mt-3">
                                  Traitée le{" "}
                                  {new Date(req.handled_at + "Z").toLocaleString("fr-FR", {
                                    timeZone: "Europe/Paris",
                                  })}
                                </p>
                              )}
                            </div>
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