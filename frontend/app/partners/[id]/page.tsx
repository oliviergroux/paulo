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
  siret?: string;
  phone?: string;
  phone_type?: string;
  address?: string;
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

  const isUrgent = (req: RequestItem) =>
    req.category === "service_local" || req.category === "mairie";

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

  const fetchPartner = async () => {
    const res = await fetch(
      `https://paulo-backend.onrender.com/partners/${id}`,
      { cache: "no-store" }
    );
    const data = await res.json();
    setPartner(data);
  };

  const fetchPartnerRequests = async () => {
    const res = await fetch(
      `https://paulo-backend.onrender.com/partners/${id}/requests`,
      { cache: "no-store" }
    );
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
  const inProgressCount = requests.filter(
    (r) => r.status === "in_progress"
  ).length;
  const doneCount = requests.filter((r) => r.status === "done").length;

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-black">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col gap-4 mb-8">

          {/* HEADER */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Fiche partenaire — {partner.name}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Vue détaillée du partenaire
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/partners"
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl"
              >
                Retour partenaires
              </Link>

              <Link
                href="/"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl"
              >
                Retour demandes
              </Link>
            </div>
          </div>

          {/* INFOS PARTENAIRE */}
          <div className="bg-white border rounded-2xl p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-lg font-semibold">{partner.name}</span>

              <span className="px-2 py-1 text-xs rounded-full bg-gray-100">
                {partner.category}
              </span>

              <span className="px-2 py-1 text-xs rounded-full bg-gray-100">
                {partner.subtype}
              </span>

              {partner.is_active ? (
                <span className="bg-green-100 text-green-700 px-2 py-1 text-xs rounded-full">
                  Actif
                </span>
              ) : (
                <span className="bg-orange-100 text-orange-700 px-2 py-1 text-xs rounded-full">
                  À valider
                </span>
              )}
            </div>

            <p className="text-sm text-gray-500">
              ID partenaire : #{partner.id}
            </p>

            {/* NOUVELLES INFOS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-sm">
              <p>
                <strong>Téléphone :</strong> {partner.phone || "—"}
              </p>

              <p>
                <strong>Type :</strong>{" "}
                {partner.phone_type === "mobile"
                  ? "Mobile"
                  : partner.phone_type === "landline"
                  ? "Fixe"
                  : partner.phone_type === "voip"
                  ? "VoIP"
                  : "Inconnu"}
              </p>

              <p>
                <strong>SIRET :</strong> {partner.siret || "—"}
              </p>

              <p className="md:col-span-2">
                <strong>Adresse :</strong> {partner.address || "—"}
              </p>
            </div>
          </div>

          {/* FILTRES */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <button onClick={() => setStatusFilter("all")} className="card">
              Toutes ({requests.length})
            </button>

            <button onClick={() => setStatusFilter("new")} className="card">
              Nouvelles ({newCount})
            </button>

            <button
              onClick={() => setStatusFilter("in_progress")}
              className="card"
            >
              En cours ({inProgressCount})
            </button>

            <button onClick={() => setStatusFilter("done")} className="card">
              Traitées ({doneCount})
            </button>
          </div>
        </div>

        {/* LISTE */}
        <div className="space-y-8">
          {Object.entries(groupedRequests)
            .reverse()
            .map(([dayLabel, dayRequests]) => (
              <React.Fragment key={dayLabel}>
                <h3 className="font-semibold">{dayLabel}</h3>

                {dayRequests.map((req) => (
                  <div key={req.id} className="bg-white p-4 rounded-xl border">
                    <p className="text-sm text-gray-500">
                      {req.phone} —{" "}
                      {new Date(req.created_at).toLocaleString()}
                    </p>

                    <p className="mt-2">{req.transcription}</p>

                    <div className="mt-2 text-xs flex gap-2">
                      {isUrgent(req) && (
                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded">
                          URGENT
                        </span>
                      )}

                      <span className="bg-gray-100 px-2 py-1 rounded">
                        {req.status}
                      </span>
                    </div>
                  </div>
                ))}
              </React.Fragment>
            ))}
        </div>
      </div>
    </main>
  );
}