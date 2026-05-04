"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Client = {
  id: number;
  phone: string;
  first_name?: string | null;
  last_name?: string | null;
  address?: string | null;
  created_at?: string;
  updated_at?: string;
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
  assigned_partner_id?: number | null;
  partner_name?: string | null;
};

export default function ClientDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchClient = async () => {
    const res = await fetch(`https://paulo-backend.onrender.com/clients/${id}`, {
      cache: "no-store",
    });
    const data = await res.json();

    if (data.client) {
      setClient(data.client);
      setRequests(Array.isArray(data.requests) ? data.requests : []);
    }
  };

  useEffect(() => {
    fetchClient();
  }, [id]);

  const formatDate = (date?: string | null) => {
    if (!date) return "—";
    return new Date(date + "Z").toLocaleString("fr-FR", {
      timeZone: "Europe/Paris",
    });
  };

  const displayName = client
    ? [client.first_name, client.last_name].filter(Boolean).join(" ") ||
      "Client sans nom"
    : "";

  const filteredRequests = requests.filter((req) =>
    statusFilter === "all" ? true : req.status === statusFilter
  );

  const newCount = requests.filter((r) => r.status === "new").length;
  const inProgressCount = requests.filter((r) => r.status === "in_progress").length;
  const doneCount = requests.filter((r) => r.status === "done").length;

  if (!client) {
    return (
      <main className="min-h-screen bg-[#f6f8fb] text-slate-950 p-8">
        Chargement...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <header className="mb-8">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-blue-600 mb-1">
                Fiche client
              </p>
              <h1 className="text-4xl font-bold tracking-tight">
                {displayName}
              </h1>
              <p className="text-slate-500 mt-2">
                Historique complet des demandes de ce client.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/clients"
                className="rounded-2xl bg-slate-950 text-white px-5 py-3 text-sm font-semibold hover:bg-slate-800 transition"
              >
                Retour clients
              </Link>

              <Link
                href="/"
                className="rounded-2xl bg-white border border-slate-200 text-slate-700 px-5 py-3 text-sm font-semibold hover:bg-slate-50 transition"
              >
                Retour demandes
              </Link>
            </div>
          </div>

          <div className="mt-6 bg-white border border-slate-200 rounded-[32px] shadow-sm p-6">
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
                <p className="font-semibold mt-2">
                  {formatDate(client.created_at)}
                </p>
              </div>

              <div className="rounded-3xl bg-slate-50 border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400 font-bold">
                  Mis à jour
                </p>
                <p className="font-semibold mt-2">
                  {formatDate(client.updated_at)}
                </p>
              </div>

              <div className="rounded-3xl bg-slate-50 border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400 font-bold">
                  Total demandes
                </p>
                <p className="font-semibold mt-2">{requests.length}</p>
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
        </header>

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

                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-700">
                    {req.status}
                  </span>
                </div>

                <p className="text-lg leading-7 text-slate-900">
                  {req.transcription}
                </p>

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
            <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-500 shadow-sm">
              Aucune demande pour ce filtre.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}