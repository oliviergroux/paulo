"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
  const [activeFilter, setActiveFilter] = useState("all");

  const fetchPartners = async () => {
    const res = await fetch("https://paulo-backend.onrender.com/partners", {
      cache: "no-store",
    });
    const data = await res.json();
    setPartners(data);
  };

  const activatePartner = async (partnerId: number) => {
    await fetch(`https://paulo-backend.onrender.com/partners/${partnerId}/activate`, {
      method: "POST",
    });

    fetchPartners();
  };

  const deactivatePartner = async (partnerId: number) => {
    await fetch(`https://paulo-backend.onrender.com/partners/${partnerId}/deactivate`, {
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

  const activeCount = partners.filter((p) => p.is_active).length;
  const inactiveCount = partners.filter((p) => !p.is_active).length;
  const totalAssigned = partners.reduce(
    (sum, p) => sum + Number(p.assigned_requests_count || 0),
    0
  );

  const phoneTypeLabel = (phoneType?: string) => {
    if (phoneType === "mobile") return "Mobile";
    if (phoneType === "landline") return "Fixe";
    if (phoneType === "voip") return "VoIP";
    return "Inconnu";
  };

  const phoneTypeClass = (phoneType?: string) => {
    if (phoneType === "mobile") return "bg-green-100 text-green-700";
    if (phoneType === "landline") return "bg-orange-100 text-orange-700";
    if (phoneType === "voip") return "bg-purple-100 text-purple-700";
    return "bg-gray-100 text-gray-700";
  };

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-black">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Paulo — Partenaires
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Validation, suivi et gestion des partenaires locaux
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/devenir-partenaire"
                className="bg-slate-950 hover:bg-slate-800 text-white px-4 py-2 rounded-xl shadow-sm transition"
              >
                Ajouter un partenaire
              </Link>

              <Link
                href="/"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl shadow-sm transition"
              >
                Retour demandes
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
              <p className="text-sm text-gray-500">Partenaires actifs</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {activeCount}
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
              <p className="text-sm text-gray-500">À valider / inactifs</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">
                {inactiveCount}
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
              <p className="text-sm text-gray-500">Demandes assignées</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {totalAssigned}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col md:flex-row gap-3 md:items-center">
            <select
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border border-gray-300 rounded-xl px-3 py-2 bg-white"
              value={categoryFilter}
            >
              <option value="all">Toutes catégories</option>
              <option value="commerce">Commerce</option>
              <option value="service_local">Service local</option>
              <option value="transport">Transport</option>
              <option value="mairie">Mairie</option>
            </select>

            <select
              onChange={(e) => setActiveFilter(e.target.value)}
              className="border border-gray-300 rounded-xl px-3 py-2 bg-white"
              value={activeFilter}
            >
              <option value="all">Tous</option>
              <option value="active">Actifs</option>
              <option value="inactive">À valider / inactifs</option>
            </select>

            <div className="md:ml-auto text-sm text-gray-500">
              {filteredPartners.length} partenaire
              {filteredPartners.length > 1 ? "s" : ""} affiché
              {filteredPartners.length > 1 ? "s" : ""}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {filteredPartners.map((partner) => (
            <div
              key={partner.id}
              className="rounded-2xl border border-gray-200 shadow-sm bg-white hover:border-blue-200 hover:shadow-md transition-all"
            >
              <div className="p-4 flex flex-col gap-4">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-gray-900">
                        {partner.name}
                      </h2>

                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${
                          partner.category === "commerce"
                            ? "bg-blue-100 text-blue-700"
                            : partner.category === "service_local"
                            ? "bg-orange-100 text-orange-700"
                            : partner.category === "transport"
                            ? "bg-emerald-100 text-emerald-700"
                            : partner.category === "mairie"
                            ? "bg-violet-100 text-violet-700"
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
                        <span className="text-xs font-medium bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                          À valider
                        </span>
                      )}

                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${phoneTypeClass(
                          partner.phone_type
                        )}`}
                      >
                        {phoneTypeLabel(partner.phone_type)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                      <p>
                        <span className="font-medium text-gray-900">Téléphone :</span>{" "}
                        {partner.phone || "Non renseigné"}
                      </p>

                      <p>
                        <span className="font-medium text-gray-900">SIRET :</span>{" "}
                        {partner.siret || "Non renseigné"}
                      </p>

                      <p className="md:col-span-2">
                        <span className="font-medium text-gray-900">Adresse :</span>{" "}
                        {partner.address || "Non renseignée"}
                      </p>

                      <p>
                        <span className="font-medium text-gray-900">Demandes :</span>{" "}
                        {Number(partner.assigned_requests_count || 0)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end lg:min-w-[360px]">
                    <Link
                      href={`/partners/${partner.id}`}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl shadow-sm transition"
                    >
                      Voir la fiche
                    </Link>

                    {partner.is_active ? (
                      <button
                        onClick={() => deactivatePartner(partner.id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl shadow-sm transition"
                      >
                        Désactiver
                      </button>
                    ) : (
                      <button
                        onClick={() => activatePartner(partner.id)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl shadow-sm transition"
                      >
                        Valider
                      </button>
                    )}

                    <Link
                      href={
                        partner.is_active
                          ? `/partner?partner_id=${partner.id}`
                          : "#"
                      }
                      className={`px-4 py-2 rounded-xl shadow-sm transition ${
                        partner.is_active
                          ? "bg-blue-600 hover:bg-blue-700 text-white"
                          : "bg-gray-200 text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      Vue partenaire
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredPartners.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-gray-500 shadow-sm">
              Aucun partenaire ne correspond aux filtres sélectionnés.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}