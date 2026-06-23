"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/api";

type Partner = {
  id: number;
  name: string;
  category: string;
  subtype: string;
  is_active: boolean;
  siret?: string;
  phone?: string;
  phone_type?: string;
  address?: string;
  assigned_requests_count: number;
};

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("pending");

  const fetchPartners = async () => {
    const res = await adminFetch("/partners");
    const data = await res.json();
    setPartners(data);
  };

  const activatePartner = async (partnerId: number) => {
    await adminFetch(`/partners/${partnerId}/activate`, {
      method: "POST",
    });
    fetchPartners();
  };

  const deactivatePartner = async (partnerId: number) => {
    await adminFetch(`/partners/${partnerId}/deactivate`, {
      method: "POST",
    });
    fetchPartners();
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  const filteredPartners = partners
    .filter((p) =>
      categoryFilter === "all" ? true : p.category === categoryFilter
    )
    .filter((p) =>
      activeFilter === "all"
        ? true
        : activeFilter === "active"
        ? p.is_active
        : !p.is_active
    );

  const pendingCount = partners.filter((p) => !p.is_active).length;
  const activeCount = partners.filter((p) => p.is_active).length;
  const mobileCount = partners.filter((p) => p.phone_type === "mobile").length;

  const phoneTypeLabel = (type?: string) => {
    if (type === "mobile") return "Mobile";
    if (type === "landline") return "Fixe";
    if (type === "voip") return "VoIP";
    return "Inconnu";
  };

  const phoneTypeClass = (type?: string) => {
    if (type === "mobile") return "bg-emerald-100 text-emerald-700";
    if (type === "landline") return "bg-orange-100 text-orange-700";
    if (type === "voip") return "bg-purple-100 text-purple-700";
    return "bg-slate-100 text-slate-700";
  };

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
                <p className="text-xs text-slate-400">Partner operations</p>
              </div>
            </div>
          </div>

          <nav className="px-4 space-y-2">
            <Link
              href="/"
              className="block rounded-2xl px-4 py-3 text-sm font-medium text-slate-300 hover:bg-white/10"
            >
              Dashboard
            </Link>

            <Link
              href="/partners"
              className="block rounded-2xl bg-white/10 px-4 py-3 text-sm font-medium"
            >
              Partenaires
            </Link>

            <Link
              href="/devenir-partenaire"
              className="block rounded-2xl px-4 py-3 text-sm font-medium text-slate-300 hover:bg-white/10"
            >
              Formulaire public
            </Link>
          </nav>

          <div className="mt-auto p-4">
            <div className="rounded-3xl bg-white/10 p-4">
              <p className="text-sm font-medium">Validation manuelle</p>
              <p className="text-xs text-slate-400 mt-1">
                Les nouveaux partenaires restent inactifs tant qu’ils ne sont pas validés.
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
                    Admin partenaires
                  </p>
                  <h1 className="text-4xl font-bold tracking-tight text-slate-950">
                    Validation partenaires
                  </h1>
                  <p className="text-slate-500 mt-2">
                    Vérifie les informations, active les profils sérieux, et garde le réseau propre.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/devenir-partenaire"
                    className="rounded-2xl bg-slate-950 text-white px-5 py-3 text-sm font-medium shadow-sm hover:bg-slate-800 transition"
                  >
                    Ajouter un partenaire
                  </Link>

                  <Link
                    href="/"
                    className="rounded-2xl bg-white border border-slate-200 text-slate-700 px-5 py-3 text-sm font-medium shadow-sm hover:bg-slate-50 transition"
                  >
                    Retour demandes
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                <button
                  onClick={() => setActiveFilter("pending")}
                  className={`rounded-3xl border p-5 shadow-sm text-left transition ${
                    activeFilter === "pending"
                      ? "bg-orange-50 border-orange-500 ring-2 ring-orange-100"
                      : "bg-white border-slate-200 hover:border-orange-200"
                  }`}
                >
                  <p className="text-sm text-slate-500">À valider</p>
                  <p className="text-3xl font-bold mt-2 text-orange-600">
                    {pendingCount}
                  </p>
                </button>

                <button
                  onClick={() => setActiveFilter("active")}
                  className={`rounded-3xl border p-5 shadow-sm text-left transition ${
                    activeFilter === "active"
                      ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-100"
                      : "bg-white border-slate-200 hover:border-emerald-200"
                  }`}
                >
                  <p className="text-sm text-slate-500">Validés</p>
                  <p className="text-3xl font-bold mt-2 text-emerald-600">
                    {activeCount}
                  </p>
                </button>

                <button
                  onClick={() => setActiveFilter("all")}
                  className={`rounded-3xl border p-5 shadow-sm text-left transition ${
                    activeFilter === "all"
                      ? "bg-blue-50 border-blue-500 ring-2 ring-blue-100"
                      : "bg-white border-slate-200 hover:border-blue-200"
                  }`}
                >
                  <p className="text-sm text-slate-500">Mobiles compatibles SMS</p>
                  <p className="text-3xl font-bold mt-2 text-blue-600">
                    {mobileCount}
                  </p>
                </button>
              </div>

              <div className="mt-5 rounded-3xl bg-white border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row gap-3 md:items-center">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                >
                  <option value="all">Toutes catégories</option>
                  <option value="commerce">Commerce</option>
                  <option value="service_local">Service local</option>
                  <option value="transport">Transport</option>
                  <option value="mairie">Mairie</option>
                </select>

                <select
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                >
                  <option value="all">Tous</option>
                  <option value="pending">À valider</option>
                  <option value="active">Validés</option>
                </select>

                <div className="md:ml-auto text-sm text-slate-500">
                  {filteredPartners.length} partenaire
                  {filteredPartners.length > 1 ? "s" : ""} affiché
                  {filteredPartners.length > 1 ? "s" : ""}
                </div>
              </div>
            </header>

            <div className="space-y-4">
              {filteredPartners.map((partner) => (
                <article
                  key={partner.id}
                  className={`rounded-[28px] border bg-white shadow-sm transition-all ${
                    partner.is_active
                      ? "border-slate-200 hover:border-emerald-200"
                      : "border-orange-200 bg-orange-50/40 hover:border-orange-300"
                  }`}
                >
                  <div className="p-5 md:p-6 grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        <h2 className="text-xl font-bold text-slate-950">
                          {partner.name}
                        </h2>

                        {partner.is_active ? (
                          <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">
                            VALIDÉ
                          </span>
                        ) : (
                          <span className="text-xs font-bold bg-orange-100 text-orange-700 px-3 py-1 rounded-full">
                            À VALIDER
                          </span>
                        )}

                        <span
                          className={`text-xs font-semibold px-3 py-1 rounded-full ${
                            partner.category === "commerce"
                              ? "bg-blue-100 text-blue-700"
                              : partner.category === "service_local"
                              ? "bg-orange-100 text-orange-700"
                              : partner.category === "transport"
                              ? "bg-emerald-100 text-emerald-700"
                              : partner.category === "mairie"
                              ? "bg-violet-100 text-violet-700"
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

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-600">
                        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                          <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold">
                            Téléphone
                          </p>
                          <p className="font-medium text-slate-900 mt-1">
                            {partner.phone || "Non renseigné"}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                          <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold">
                            SIRET
                          </p>
                          <p className="font-medium text-slate-900 mt-1">
                            {partner.siret || "Non renseigné"}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3 md:col-span-2">
                          <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold">
                            Adresse
                          </p>
                          <p className="font-medium text-slate-900 mt-1">
                            {partner.address || "Non renseignée"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl bg-slate-50 border border-slate-200 p-4 flex flex-col gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold">
                          Activité
                        </p>
                        <p className="text-2xl font-bold text-slate-950 mt-1">
                          {Number(partner.assigned_requests_count || 0)}
                        </p>
                        <p className="text-sm text-slate-500">
                          demande
                          {Number(partner.assigned_requests_count || 0) > 1 ? "s" : ""} assignée
                          {Number(partner.assigned_requests_count || 0) > 1 ? "s" : ""}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2 mt-2">
                        <Link
                          href={`/partners/${partner.id}`}
                          className="w-full text-center rounded-2xl bg-white border border-slate-200 text-slate-800 px-4 py-3 text-sm font-semibold hover:bg-slate-100 transition"
                        >
                          Voir la fiche
                        </Link>

                        {partner.is_active ? (
                          <button
                            onClick={() => deactivatePartner(partner.id)}
                            className="w-full rounded-2xl bg-red-600 hover:bg-red-700 text-white px-4 py-3 text-sm font-semibold transition"
                          >
                            Désactiver
                          </button>
                        ) : (
                          <button
                            onClick={() => activatePartner(partner.id)}
                            className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 text-sm font-semibold transition"
                          >
                            Valider le partenaire
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))}

              {filteredPartners.length === 0 && (
                <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-500 shadow-sm">
                  Aucun partenaire ne correspond aux filtres sélectionnés.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}