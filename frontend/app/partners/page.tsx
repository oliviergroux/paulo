"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Partner = {
  id: number;
  name: string;
  category: string;
  subtype: string;
  is_active: boolean;
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

  useEffect(() => {
    fetchPartners();
  }, []);

  return (
    <main className="p-8 bg-white min-h-screen text-black">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Paulo — Partenaires</h1>
        <Link
          href="/"
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Retour demandes
        </Link>
      </div>

      <div className="flex gap-4 mb-4">
        <select
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="all">Toutes catégories</option>
          <option value="commerce">Commerce</option>
          <option value="service_local">Service local</option>
          <option value="transport">Transport</option>
        </select>

        <select
          onChange={(e) => setActiveFilter(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="all">Tous</option>
          <option value="active">Actifs</option>
          <option value="inactive">Inactifs</option>
        </select>
      </div>

      <table className="w-full border border-blue-200">
        <thead>
          <tr className="bg-blue-100 text-left">
            <th className="p-3 border border-blue-200">Nom</th>
            <th className="p-3 border border-blue-200">Catégorie</th>
            <th className="p-3 border border-blue-200">Sous-type</th>
            <th className="p-3 border border-blue-200">Statut</th>
            <th className="p-3 border border-blue-200">Demandes</th>
            <th className="p-3 border border-blue-200">Action</th>
          </tr>
        </thead>
        <tbody>
          {partners
            .filter((p) =>
              categoryFilter === "all" ? true : p.category === categoryFilter
            )
            .filter((p) =>
              activeFilter === "all"
                ? true
                : activeFilter === "active"
                ? p.is_active
                : !p.is_active
            )
            .map((partner) => (
              <tr key={partner.id} className="hover:bg-blue-50">
                <td className="p-3 border border-blue-200">{partner.name}</td>
                <td className="p-3 border border-blue-200">{partner.category}</td>
                <td className="p-3 border border-blue-200">{partner.subtype}</td>
                <td className="p-3 border border-blue-200">
                  {partner.is_active ? (
                    <span className="text-green-600 font-medium">Actif</span>
                  ) : (
                    <span className="text-red-600 font-medium">Inactif</span>
                  )}
                </td>
                <td className="p-3 border border-blue-200">
                  {partner.assigned_requests_count}
                </td>
                <td className="p-3 border border-blue-200">
                  <Link
                    href={`/partners/${partner.id}`}
                    className="bg-purple-600 text-white px-3 py-1 rounded"
                  >
                    Voir
                  </Link>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </main>
  );
}