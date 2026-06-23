"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { adminFetch } from "@/lib/api";

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
  access_token?: string;
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
  first_name?: string | null;
  last_name?: string | null;
  address?: string | null;
};

export default function PartnerDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [partner, setPartner] = useState<Partner | null>(null);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchPartner = async () => {
    const res = await adminFetch(`/partners/${id}`);
    const data = await res.json();
    setPartner(data);
  };

  const fetchRequests = async () => {
    const res = await adminFetch(`/partners/${id}/requests`);
    const data = await res.json();

    if (Array.isArray(data)) {
      setRequests(data);
    }
  };

  useEffect(() => {
    fetchPartner();
    fetchRequests();
  }, [id]);

  const formatDate = (dateString: string) =>
    new Date(dateString + "Z").toLocaleString("fr-FR", {
      timeZone: "Europe/Paris",
    });

  const isUrgent = (req: RequestItem) =>
    req.category === "service_local" || req.category === "mairie";

  const phoneTypeLabel = (type?: string) => {
    if (type === "mobile") return "Mobile";
    if (type === "landline") return "Fixe";
    if (type === "voip") return "VoIP";
    return "Inconnu";
  };

  const phoneTypeClass = (type?: string) => {
    if (type === "mobile") return "bg-emerald-100 text-emerald-700";
    if (type === "landline") return "bg-orange-100 text-orange-700";
    if (type === "voip") return "bg-violet-100 text-violet-700";
    return "bg-slate-100 text-slate-700";
  };

  const filteredRequests = requests.filter((req) =>
    statusFilter === "all" ? true : req.status === statusFilter
  );

  const newCount = requests.filter((r) => r.status === "new").length;
  const inProgressCount = requests.filter((r) => r.status === "in_progress").length;
  const doneCount = requests.filter((r) => r.status === "done").length;

  if (!partner) {
    return (
      <main className="min-h-screen bg-[#f6f8fb] text-slate-950 p-8">
        <p>Chargement...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-blue-600 mb-1">
                Fiche partenaire
              </p>
              <h1 className="text-4xl font-bold tracking-tight">
                {partner.name}
              </h1>
              <p className="text-slate-500 mt-2">
                Vue admin du partenaire et de ses demandes assignées.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/partners"
                className="rounded-2xl bg-slate-950 text-white px-5 py-3 text-sm font-semibold hover:bg-slate-800 transition"
              >
                Retour partenaires
              </Link>

              <Link
                href="/"
                className="rounded-2xl bg-white border border-slate-200 text-slate-700 px-5 py-3 text-sm font-semibold hover:bg-slate-50 transition"
              >
                Retour demandes
              </Link>

              <Link
                href={`/partner?partner_id=${partner.id}&token=${partner.access_token || ""}`}
                className="rounded-2xl bg-blue-600 text-white px-5 py-3 text-sm font-semibold hover:bg-blue-700 transition"
              >
                Vue partenaire
              </Link>
            </div>
          </div>

          <div className="mt-6 bg-white border border-slate-200 rounded-[32px] shadow-sm p-6">
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

              <span
                className={`text-xs font-semibold px-3 py-1 rounded-full ${
                  partner.category === "commerce"
                    ? "bg-blue-100 text-blue-700"
                    : partner.category === "service_local"
                    ? "bg-orange-100 text-orange-700"
                    : partner.category === "mairie"
                    ? "bg-violet-100 text-violet-700"
                    : partner.category === "transport"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {partner.category}
              </span>

              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                {partner.subtype}
              </span>

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

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <button
              onClick={() => setStatusFilter("all")}
              className={`rounded-3xl border p-5 shadow-sm text-left transition ${
                statusFilter === "all"
                  ? "bg-blue-50 border-blue-500 ring-2 ring-blue-100"
                  : "bg-white border-slate-200 hover:border-blue-200"
              }`}
            >
              <p className="text-sm text-slate-500">Toutes</p>
              <p className="text-3xl font-bold mt-2">{requests.length}</p>
            </button>

            <button
              onClick={() => setStatusFilter("new")}
              className={`rounded-3xl border p-5 shadow-sm text-left transition ${
                statusFilter === "new"
                  ? "bg-slate-50 border-slate-500 ring-2 ring-slate-100"
                  : "bg-white border-slate-200 hover:border-slate-300"
              }`}
            >
              <p className="text-sm text-slate-500">Nouvelles</p>
              <p className="text-3xl font-bold mt-2">{newCount}</p>
            </button>

            <button
              onClick={() => setStatusFilter("in_progress")}
              className={`rounded-3xl border p-5 shadow-sm text-left transition ${
                statusFilter === "in_progress"
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
              onClick={() => setStatusFilter("done")}
              className={`rounded-3xl border p-5 shadow-sm text-left transition ${
                statusFilter === "done"
                  ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-100"
                  : "bg-white border-slate-200 hover:border-emerald-200"
              }`}
            >
              <p className="text-sm text-slate-500">Traitées</p>
              <p className="text-3xl font-bold mt-2 text-emerald-600">
                {doneCount}
              </p>
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {filteredRequests.map((req) => (
            <article
              key={req.id}
              className="rounded-[28px] border border-slate-200 bg-white shadow-sm hover:border-blue-200 hover:shadow-md transition"
            >
              <div className="p-5 md:p-6 grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    {isUrgent(req) && (
                      <span className="text-xs font-bold bg-red-100 text-red-700 px-3 py-1 rounded-full">
                        URGENT
                      </span>
                    )}

                    <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                      {formatDate(req.created_at)}
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
                          {[req.first_name, req.last_name].filter(Boolean).join(" ")}
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
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                    Statut
                  </p>

                  {req.status === "done" ? (
                    <span className="inline-flex text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full text-sm font-semibold">
                      Traité
                    </span>
                  ) : req.status === "in_progress" ? (
                    <span className="inline-flex text-orange-700 bg-orange-100 px-3 py-1 rounded-full text-sm font-semibold">
                      En cours
                    </span>
                  ) : (
                    <span className="inline-flex text-slate-700 bg-white border border-slate-200 px-3 py-1 rounded-full text-sm font-semibold">
                      Nouveau
                    </span>
                  )}

                  {req.handled_at && (
                    <p className="text-xs text-slate-500 mt-3">
                      Traité le {formatDate(req.handled_at)}
                    </p>
                  )}
                </div>
              </div>
            </article>
          ))}

          {filteredRequests.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-500 shadow-sm">
              Aucune demande pour ce filtre.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}