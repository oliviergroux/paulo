"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Partner = {
  id: number;
  name: string;
  category: string;
  subtype: string;
  is_active: boolean;
  created_at: string;
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
      <main className="p-8 bg-white min-h-screen text-black">
        <p>Chargement...</p>
      </main>
    );
  }

  return (
    <main className="p-8 bg-white min-h-screen text-black">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Fiche partenaire</h1>
        <div className="flex gap-3">
          <Link href="/partners" className="bg-purple-600 text-white px-4 py-2 rounded">
            Retour partenaires
          </Link>
          <Link href="/" className="bg-blue-500 text-white px-4 py-2 rounded">
            Retour demandes
          </Link>
        </div>
      </div>

      <div className="border border-blue-200 rounded p-4 mb-6 bg-blue-50">
        <p><strong>Nom :</strong> {partner.name}</p>
        <p><strong>Catégorie :</strong> {partner.category}</p>
        <p><strong>Sous-type :</strong> {partner.subtype}</p>
        <p>
          <strong>Statut :</strong>{" "}
          {partner.is_active ? (
            <span className="text-green-600 font-medium">Actif</span>
          ) : (
            <span className="text-red-600 font-medium">Inactif</span>
          )}
        </p>
      </div>

      <h2 className="text-xl font-semibold mb-4">Demandes assignées</h2>

      <table className="w-full border border-blue-200">
        <thead>
          <tr className="bg-blue-100 text-left">
            <th className="p-3 border border-blue-200">Date</th>
            <th className="p-3 border border-blue-200">Téléphone</th>
            <th className="p-3 border border-blue-200">Demande</th>
            <th className="p-3 border border-blue-200">Catégorie</th>
            <th className="p-3 border border-blue-200">Sous-type</th>
            <th className="p-3 border border-blue-200">Status</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((req) => (
            <tr key={req.id} className="hover:bg-blue-50">
              <td className="p-3 border border-blue-200">
                {new Date(req.created_at + "Z").toLocaleString("fr-FR", {
                  timeZone: "Europe/Paris",
                })}
              </td>
              <td className="p-3 border border-blue-200">{req.phone}</td>
              <td className="p-3 border border-blue-200">{req.transcription}</td>
              <td className="p-3 border border-blue-200">{req.category}</td>
              <td className="p-3 border border-blue-200">{req.subtype}</td>
              <td className="p-3 border border-blue-200">
                {req.status === "done" ? (
                  <span className="text-green-600 font-medium">Traité</span>
                ) : (
                  <span className="text-orange-600 font-medium">{req.status}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}