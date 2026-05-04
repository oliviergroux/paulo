"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Client = {
  id: number;
  phone: string;
  first_name?: string | null;
  last_name?: string | null;
  address?: string | null;
  created_at?: string;
  updated_at?: string;
  total_requests: number;
  last_request_at?: string | null;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");

  const fetchClients = async () => {
    const res = await fetch("https://paulo-backend.onrender.com/clients", {
      cache: "no-store",
    });
    const data = await res.json();
    setClients(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const filteredClients = clients.filter((client) => {
    const fullName = [client.first_name, client.last_name]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const query = search.toLowerCase();

    return (
      fullName.includes(query) ||
      client.phone?.toLowerCase().includes(query) ||
      client.address?.toLowerCase().includes(query)
    );
  });

  const namedCount = clients.filter((c) => c.first_name || c.last_name).length;
  const addressCount = clients.filter((c) => c.address).length;
  const totalRequests = clients.reduce(
    (sum, c) => sum + Number(c.total_requests || 0),
    0
  );

  const formatDate = (date?: string | null) => {
    if (!date) return "—";
    return new Date(date + "Z").toLocaleString("fr-FR", {
      timeZone: "Europe/Paris",
    });
  };

  const displayName = (client: Client) => {
    const name = [client.first_name, client.last_name].filter(Boolean).join(" ");
    return name || "Client sans nom";
  };

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <header className="mb-8">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-blue-600 mb-1">
                CRM local
              </p>
              <h1 className="text-4xl font-bold tracking-tight">
                Clients
              </h1>
              <p className="text-slate-500 mt-2">
                Fiches clients créées automatiquement depuis les appels et WhatsApp.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/"
                className="rounded-2xl bg-slate-950 text-white px-5 py-3 text-sm font-semibold hover:bg-slate-800 transition"
              >
                Retour demandes
              </Link>

              <Link
                href="/partners"
                className="rounded-2xl bg-white border border-slate-200 text-slate-700 px-5 py-3 text-sm font-semibold hover:bg-slate-50 transition"
              >
                Partenaires
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
              <p className="text-sm text-slate-500">Clients</p>
              <p className="text-3xl font-bold mt-2">{clients.length}</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
              <p className="text-sm text-slate-500">Profils identifiés</p>
              <p className="text-3xl font-bold mt-2 text-blue-600">
                {namedCount}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
              <p className="text-sm text-slate-500">Demandes liées</p>
              <p className="text-3xl font-bold mt-2 text-emerald-600">
                {totalRequests}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-3xl bg-white border border-slate-200 shadow-sm p-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom, téléphone ou adresse..."
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            />
          </div>
        </header>

        <div className="space-y-4">
          {filteredClients.map((client) => (
            <article
              key={client.id}
              className="bg-white border border-slate-200 rounded-[28px] shadow-sm hover:border-blue-200 hover:shadow-md transition"
            >
              <div className="p-5 md:p-6 grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <h2 className="text-xl font-bold">
                      {displayName(client)}
                    </h2>

                    <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
                      {client.phone}
                    </span>

                    {client.address && (
                      <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">
                        Adresse connue
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-400 font-bold">
                        Téléphone
                      </p>
                      <p className="font-semibold mt-2">{client.phone}</p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-400 font-bold">
                        Dernière demande
                      </p>
                      <p className="font-semibold mt-2">
                        {formatDate(client.last_request_at)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 md:col-span-2">
                      <p className="text-xs uppercase tracking-wide text-slate-400 font-bold">
                        Adresse
                      </p>
                      <p className="font-semibold mt-2">
                        {client.address || "Non renseignée"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl bg-slate-50 border border-slate-200 p-4 flex flex-col justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400 font-bold">
                      Activité
                    </p>
                    <p className="text-3xl font-bold mt-2">
                      {Number(client.total_requests || 0)}
                    </p>
                    <p className="text-sm text-slate-500">
                      demande
                      {Number(client.total_requests || 0) > 1 ? "s" : ""}
                    </p>
                  </div>

                  <Link
                    href={`/clients/${client.id}`}
                    className="w-full text-center rounded-2xl bg-slate-950 text-white px-4 py-3 text-sm font-semibold hover:bg-slate-800 transition"
                  >
                    Voir la fiche
                  </Link>
                </div>
              </div>
            </article>
          ))}

          {filteredClients.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-500 shadow-sm">
              Aucun client trouvé.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}