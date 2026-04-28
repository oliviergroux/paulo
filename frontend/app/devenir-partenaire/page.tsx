"use client";

import { useState } from "react";
import Link from "next/link";

export default function BecomePartnerPage() {
  const [form, setForm] = useState({
    name: "",
    siret: "",
    phone: "",
    category: "commerce",
    subtype: "",
    address: "",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const updateField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("https://paulo-backend.onrender.com/partners/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!data.ok) {
        setError("Une erreur est survenue.");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Impossible d’envoyer la demande.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen bg-[#f6f8fb] flex items-center justify-center p-6 text-black">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-lg shadow-sm">
          <h1 className="text-2xl font-bold mb-3">Demande envoyée ✅</h1>
          <p className="text-slate-600">
            Merci. Votre demande partenaire a bien été reçue. Paulo vous recontactera après validation.
          </p>

          <Link
            href="/"
            className="inline-block mt-6 bg-slate-950 text-white px-5 py-3 rounded-2xl"
          >
            Retour
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-black">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <p className="text-sm font-medium text-blue-600 mb-1">
            Devenir partenaire
          </p>
          <h1 className="text-4xl font-bold tracking-tight">
            Rejoindre le réseau Paulo
          </h1>
          <p className="text-slate-500 mt-2">
            Recevez des demandes locales qualifiées selon votre activité.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">Nom de l’entreprise</label>
            <input
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="w-full border border-slate-200 rounded-2xl px-4 py-3"
              placeholder="Ex : Plomberie Martin"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">SIRET</label>
            <input
              value={form.siret}
              onChange={(e) => updateField("siret", e.target.value)}
              className="w-full border border-slate-200 rounded-2xl px-4 py-3"
              placeholder="Ex : 12345678900012"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Téléphone</label>
            <input
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              className="w-full border border-slate-200 rounded-2xl px-4 py-3"
              placeholder="+33612345678"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Adresse</label>
            <input
              value={form.address}
              onChange={(e) => updateField("address", e.target.value)}
              className="w-full border border-slate-200 rounded-2xl px-4 py-3"
              placeholder="Adresse complète"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Catégorie</label>
              <select
                value={form.category}
                onChange={(e) => updateField("category", e.target.value)}
                className="w-full border border-slate-200 rounded-2xl px-4 py-3 bg-white"
              >
                <option value="commerce">Commerce</option>
                <option value="service_local">Service local</option>
                <option value="transport">Transport</option>
                <option value="mairie">Mairie</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Sous-type</label>
              <input
                value={form.subtype}
                onChange={(e) => updateField("subtype", e.target.value)}
                className="w-full border border-slate-200 rounded-2xl px-4 py-3"
                placeholder="Ex : plombier, fleuriste, boucher..."
              />
            </div>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            onClick={submit}
            disabled={loading}
            className="w-full bg-slate-950 hover:bg-slate-800 text-white px-5 py-3 rounded-2xl font-medium disabled:bg-slate-400"
          >
            {loading ? "Envoi..." : "Envoyer ma demande"}
          </button>
        </div>
      </div>
    </main>
  );
}