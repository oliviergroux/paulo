"use client";

import { useState } from "react";
import Link from "next/link";

const APP_URL = "https://paulo-teal-nine.vercel.app";

const SUBTYPES = {
  commerce: ["fleuriste", "boucher"],
  service_local: [
    "maçon",
    "pisciniste",
    "electricien",
    "plombier",
    "petits_travaux",
  ],
  transport: ["taxi"],
  mairie: ["mairie"],
};

const PROFILE_COPY = {
  commerce: {
    icon: "🛍️",
    title: "Commerce",
    promise: "Recevez des demandes locales simples et qualifiées.",
  },
  service_local: {
    icon: "🔧",
    title: "Service local",
    promise: "Recevez des demandes de clients proches de chez vous.",
  },
  mairie: {
    icon: "🏛️",
    title: "Mairie",
    promise: "Centralisez les demandes des habitants en temps réel.",
  },
  transport: {
    icon: "🚕",
    title: "Transport",
    promise: "Recevez des demandes de déplacement locales.",
  },
};

export default function BecomePartnerPage() {
  const [form, setForm] = useState({
    name: "",
    siret: "",
    phone: "",
    category: "commerce",
    subtype: "",
    address: "",
  });

  const [createdPartner, setCreatedPartner] = useState<{
    id: number;
    name: string;
    access_token: string;
    is_active: boolean;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedProfile =
    PROFILE_COPY[form.category as keyof typeof PROFILE_COPY];

  const availableSubtypes =
    SUBTYPES[form.category as keyof typeof SUBTYPES] || [];

  const partnerUrl = createdPartner
    ? `${APP_URL}/partner?partner_id=${createdPartner.id}&token=${createdPartner.access_token}`
    : "";

  const updateField = (key: string, value: string) => {
    setForm((prev) => {
      if (key === "category") {
        return {
          ...prev,
          category: value,
          subtype: "",
        };
      }

      return {
        ...prev,
        [key]: value,
      };
    });
  };

  const submit = async () => {
    setLoading(true);
    setError("");

    if (
      !form.name.trim() ||
      !form.siret.trim() ||
      !form.phone.trim() ||
      !form.category.trim() ||
      !form.subtype.trim() ||
      !form.address.trim()
    ) {
      setError("Merci de remplir tous les champs.");
      setLoading(false);
      return;
    }

    if (form.siret.trim().length < 9) {
      setError("Merci d’indiquer un SIRET valide.");
      setLoading(false);
      return;
    }

    if (form.phone.trim().length < 8) {
      setError("Merci d’indiquer un numéro de téléphone valide.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("https://paulo-backend.onrender.com/partners/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          siret: form.siret.trim(),
          phone: form.phone.trim(),
          category: form.category.trim(),
          subtype: form.subtype.trim(),
          address: form.address.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError("Une erreur est survenue. Merci de vérifier les informations.");
        return;
      }

      setCreatedPartner(data.partner);
    } catch {
      setError("Impossible d’envoyer la demande.");
    } finally {
      setLoading(false);
    }
  };

  if (createdPartner) {
    return (
      <main className="min-h-screen bg-[#f5f7fb] text-slate-950 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-white border border-slate-200 rounded-[32px] shadow-sm p-8">
          <div className="h-14 w-14 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl mb-5">
            ✅
          </div>

          <p className="text-sm font-semibold text-blue-600 mb-1">
            Demande partenaire reçue
          </p>

          <h1 className="text-3xl font-bold tracking-tight">
            Votre espace Paulo est prêt
          </h1>

          <p className="text-slate-600 mt-3 leading-7">
            Merci {createdPartner.name}. Votre profil a bien été créé et va être
            vérifié prochainement par l’équipe Paulo.
          </p>

          <div className="mt-6 rounded-3xl bg-orange-50 border border-orange-200 p-5">
            <p className="font-semibold text-orange-800">
              ⏳ Validation en cours
            </p>
            <p className="text-sm text-orange-700 mt-2 leading-6">
              Votre tableau de bord est accessible, mais vous ne recevrez pas
              encore de demandes tant que votre profil n’a pas été validé.
            </p>
          </div>

          <div className="mt-6 rounded-3xl bg-slate-50 border border-slate-200 p-5">
            <p className="text-sm font-semibold text-slate-700 mb-2">
              Votre lien partenaire
            </p>

            <div className="bg-white border border-slate-200 rounded-2xl p-3 text-sm text-slate-600 break-all">
              {partnerUrl}
            </div>

            <p className="text-xs text-slate-400 mt-2">
              Gardez ce lien. Il donne accès à votre espace partenaire.
            </p>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Link
              href={partnerUrl}
              className="text-center bg-slate-950 hover:bg-slate-800 text-white px-5 py-3 rounded-2xl font-semibold"
            >
              Ouvrir mon espace partenaire
            </Link>

            <Link
              href="/"
              className="text-center bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-5 py-3 rounded-2xl font-semibold"
            >
              Retour
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <p className="text-sm font-semibold text-blue-600 mb-1">
            Devenir partenaire Paulo
          </p>

          <h1 className="text-4xl font-bold tracking-tight">
            Recevez des demandes locales qualifiées
          </h1>

          <p className="text-slate-500 mt-3 max-w-2xl leading-7">
            Rejoignez le réseau Paulo et recevez les demandes pertinentes selon
            votre activité. Chaque partenaire est validé manuellement pour
            garantir un réseau fiable.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
          {Object.entries(PROFILE_COPY).map(([key, item]) => (
            <button
              key={key}
              onClick={() => updateField("category", key)}
              className={`rounded-3xl border p-4 text-left transition ${
                form.category === key
                  ? "bg-slate-950 text-white border-slate-950 shadow-sm"
                  : "bg-white border-slate-200 hover:border-blue-200"
              }`}
            >
              <div className="text-2xl mb-2">{item.icon}</div>
              <p className="font-bold">{item.title}</p>
              <p
                className={`text-xs mt-2 leading-5 ${
                  form.category === key ? "text-slate-300" : "text-slate-500"
                }`}
              >
                {item.promise}
              </p>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          <div className="bg-white border border-slate-200 rounded-[32px] shadow-sm p-6 space-y-5">
            <div>
              <label className="block text-sm font-semibold mb-2">
                Nom de l’entreprise
              </label>
              <input
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                className="w-full border border-slate-200 rounded-2xl px-4 py-3"
                placeholder="Ex : Plomberie Martin"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">SIRET</label>
              <input
                value={form.siret}
                onChange={(e) => updateField("siret", e.target.value)}
                className="w-full border border-slate-200 rounded-2xl px-4 py-3"
                placeholder="Ex : 12345678900012"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                Téléphone
              </label>
              <input
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                className="w-full border border-slate-200 rounded-2xl px-4 py-3"
                placeholder="+33612345678 ou 0612345678"
              />
              <p className="text-xs text-slate-400 mt-2">
                Les numéros mobiles permettent les notifications SMS / WhatsApp.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                Adresse
              </label>
              <input
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
                className="w-full border border-slate-200 rounded-2xl px-4 py-3"
                placeholder="Adresse complète"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                Sous-type
              </label>
              <select
                value={form.subtype}
                onChange={(e) => updateField("subtype", e.target.value)}
                className="w-full border border-slate-200 rounded-2xl px-4 py-3 bg-white"
              >
                <option value="">Choisir un sous-type</option>
                {availableSubtypes.map((subtype) => (
                  <option key={subtype} value={subtype}>
                    {subtype.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button
              onClick={submit}
              disabled={loading}
              className="w-full bg-slate-950 hover:bg-slate-800 text-white px-5 py-3 rounded-2xl font-semibold disabled:bg-slate-400"
            >
              {loading ? "Envoi..." : "Créer mon profil partenaire"}
            </button>
          </div>

          <aside className="bg-slate-950 text-white rounded-[32px] p-6 h-fit">
            <div className="text-3xl mb-4">{selectedProfile.icon}</div>

            <h2 className="text-2xl font-bold">
              {selectedProfile.title}
            </h2>

            <p className="text-slate-300 text-sm mt-3 leading-6">
              {selectedProfile.promise}
            </p>

            <div className="mt-6 space-y-4">
              <div className="rounded-3xl bg-white/10 border border-white/10 p-4">
                <p className="font-semibold">1. Inscription</p>
                <p className="text-xs text-slate-400 mt-1">
                  Vous renseignez vos informations professionnelles.
                </p>
              </div>

              <div className="rounded-3xl bg-white/10 border border-white/10 p-4">
                <p className="font-semibold">2. Validation Paulo</p>
                <p className="text-xs text-slate-400 mt-1">
                  Le profil est vérifié avant d’être activé.
                </p>
              </div>

              <div className="rounded-3xl bg-white/10 border border-white/10 p-4">
                <p className="font-semibold">3. Demandes qualifiées</p>
                <p className="text-xs text-slate-400 mt-1">
                  Vous recevez uniquement les demandes adaptées à votre activité.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}