"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import EmptyState from "@/components/EmptyState";
import KpiCard from "@/components/KpiCard";
import PageHeader from "@/components/PageHeader";
import { adminFetch } from "@/lib/api";
import { displayClientName, formatDate } from "@/lib/format";
import type { ClientItem } from "@/lib/types";

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [search, setSearch] = useState("");

  const fetchClients = async () => {
    const res = await adminFetch("/clients");
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
  const totalRequests = clients.reduce(
    (sum, c) => sum + Number(c.total_requests || 0),
    0
  );

  return (
    <AppShell
      activeNav="clients"
      sidebarNote={{
        title: "CRM habitants",
        description:
          "Fiches créées automatiquement depuis les appels et WhatsApp.",
      }}
    >
      <PageHeader
        eyebrow="CRM local"
        title="Clients"
        description="Fiches clients créées automatiquement depuis les appels et WhatsApp."
        actions={
          <>
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
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <KpiCard label="Clients" value={clients.length} variant="blue" />
        <KpiCard
          label="Profils identifiés"
          value={namedCount}
          variant="blue"
          valueClassName="text-blue-600"
        />
        <KpiCard
          label="Demandes liées"
          value={totalRequests}
          variant="emerald"
          valueClassName="text-emerald-600"
        />
      </div>

      <div className="mb-8 rounded-3xl bg-white border border-slate-200 shadow-sm p-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom, téléphone ou adresse..."
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
        />
      </div>

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
                    {displayClientName(client.first_name, client.last_name)}
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
          <EmptyState message="Aucun client trouvé." />
        )}
      </div>
    </AppShell>
  );
}
