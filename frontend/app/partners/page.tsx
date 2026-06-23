"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AuthenticatedShell from "@/components/AuthenticatedShell";
import CategoryBadge from "@/components/CategoryBadge";
import EmptyState from "@/components/EmptyState";
import KpiCard from "@/components/KpiCard";
import PageHeader from "@/components/PageHeader";
import { adminFetch } from "@/lib/api";
import { phoneTypeClass, phoneTypeLabel } from "@/lib/format";
import type { PartnerDetail } from "@/lib/types";

export default function PartnersPage() {
  const [partners, setPartners] = useState<PartnerDetail[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("pending");

  const fetchPartners = async () => {
    const res = await adminFetch("/partners");
    setPartners(await res.json());
  };

  const activatePartner = async (partnerId: number) => {
    await adminFetch(`/partners/${partnerId}/activate`, { method: "POST" });
    fetchPartners();
  };

  const deactivatePartner = async (partnerId: number) => {
    await adminFetch(`/partners/${partnerId}/deactivate`, { method: "POST" });
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

  return (
    <AuthenticatedShell
      activeNav="partners"
      sidebarNote={{
        title: "Validation manuelle",
        description:
          "Les nouveaux partenaires restent inactifs tant qu’ils ne sont pas validés.",
      }}
    >
      <PageHeader
        eyebrow="Admin partenaires"
        title="Validation partenaires"
        description="Vérifie les informations, active les profils sérieux, et garde le réseau propre."
        actions={
          <>
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
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <KpiCard
          label="À valider"
          value={pendingCount}
          active={activeFilter === "pending"}
          variant="orange"
          valueClassName="text-orange-600"
          onClick={() => setActiveFilter("pending")}
        />
        <KpiCard
          label="Validés"
          value={activeCount}
          active={activeFilter === "active"}
          variant="emerald"
          valueClassName="text-emerald-600"
          onClick={() => setActiveFilter("active")}
        />
        <KpiCard
          label="Mobiles compatibles SMS"
          value={mobileCount}
          active={activeFilter === "all"}
          variant="blue"
          valueClassName="text-blue-600"
          onClick={() => setActiveFilter("all")}
        />
      </div>

      <div className="mb-8 rounded-3xl bg-white border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row gap-3 md:items-center">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
        >
          <option value="all">Toutes catégories</option>
          <option value="commerce">Commerce</option>
          <option value="service_local">Service local</option>
          <option value="transport">Transport</option>
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

                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${
                      partner.is_active
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {partner.is_active ? "VALIDÉ" : "À VALIDER"}
                  </span>

                  <CategoryBadge
                    category={partner.category}
                    subtype={partner.subtype}
                  />

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
                    {Number(partner.assigned_requests_count || 0) > 1 ? "s" : ""}{" "}
                    assignée
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
          <EmptyState message="Aucun partenaire ne correspond aux filtres sélectionnés." />
        )}
      </div>
    </AuthenticatedShell>
  );
}
