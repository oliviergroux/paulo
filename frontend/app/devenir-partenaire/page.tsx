"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SUBTYPES, subtypeLabel } from "@/lib/taxonomy";
import {
  PARTNER_FORM_SIRET_NOTICE,
  PARTNER_FORM_VALIDATION_NOTICE,
} from "@/content/partner-legal-fr";
import {
  companyIdentifierHint,
  isValidCompanyIdentifier,
} from "@/lib/company-identifier";
import {
  isValidEmail,
  isValidPostalCode,
  normalizePostalCode,
} from "@/lib/partner-address";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://paulo-teal-nine.vercel.app";

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
  transport: {
    icon: "🚕",
    title: "Transport",
    promise: "Recevez des demandes de déplacement locales.",
  },
};

const LOADING_STEPS = [
  "Envoi de votre dossier…",
  "Création du profil partenaire…",
  "Vérification SIRET auprès du registre officiel…",
  "Analyse de cohérence du dossier…",
  "Finalisation…",
];

function PartnerApplyLoadingOverlay({
  stepIndex,
  progress,
}: {
  stepIndex: number;
  progress: number;
}) {
  const step = LOADING_STEPS[Math.min(stepIndex, LOADING_STEPS.length - 1)];

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[32px] bg-white/95 backdrop-blur-sm p-6">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-5 h-14 w-14 rounded-3xl bg-blue-100 text-blue-700 flex items-center justify-center">
          <svg
            className="h-7 w-7 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-90"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>

        <p className="text-sm font-semibold text-blue-600 mb-1">
          Inscription en cours
        </p>
        <h2 className="text-xl font-bold text-slate-900">
          Vérification de votre dossier
        </h2>
        <p className="text-sm text-slate-600 mt-3 leading-6 min-h-[3rem]">
          {step}
        </p>
        <p className="text-xs text-slate-400 mt-2">
          Cela peut prendre 10 à 30 secondes. Merci de ne pas fermer la page.
        </p>

        <div className="mt-6 h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-slate-900 transition-all duration-700 ease-out"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <p className="text-xs font-semibold text-slate-500 mt-2">
          {Math.min(Math.round(progress), 100)} %
        </p>
      </div>
    </div>
  );
}

export default function BecomePartnerPage() {
  const [form, setForm] = useState({
    name: "",
    siret: "",
    phone: "",
    category: "commerce",
    subtype: "",
    address: "",
    postal_code: "",
    city: "",
    email: "",
  });

  const [createdPartner, setCreatedPartner] = useState<{
    id: number;
    name: string;
    access_token: string;
    is_active: boolean;
    validation_status?: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [acceptedLegal, setAcceptedLegal] = useState(false);

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

  useEffect(() => {
    if (!loading) {
      setLoadingStep(0);
      setLoadingProgress(0);
      return;
    }

    setLoadingStep(0);
    setLoadingProgress(8);

    const stepTimer = window.setInterval(() => {
      setLoadingStep((current) =>
        Math.min(current + 1, LOADING_STEPS.length - 1)
      );
    }, 2800);

    const progressTimer = window.setInterval(() => {
      setLoadingProgress((current) => {
        if (current >= 92) return current;
        const increment = current < 40 ? 6 : current < 75 ? 4 : 2;
        return Math.min(current + increment, 92);
      });
    }, 900);

    return () => {
      window.clearInterval(stepTimer);
      window.clearInterval(progressTimer);
    };
  }, [loading]);

  const copyPartnerUrl = async () => {
    try {
      await navigator.clipboard.writeText(partnerUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Impossible de copier automatiquement. Vous pouvez copier le lien manuellement.");
    }
  };

  const submit = async () => {
    setError("");

    if (
      !form.name.trim() ||
      !form.siret.trim() ||
      !form.phone.trim() ||
      !form.category.trim() ||
      !form.subtype.trim() ||
      !form.address.trim() ||
      !form.postal_code.trim() ||
      !form.city.trim() ||
      !form.email.trim()
    ) {
      setError("Merci de remplir tous les champs.");
      return;
    }

    if (!isValidCompanyIdentifier(form.siret)) {
      setError("Merci d’indiquer un SIREN (9 chiffres) ou un SIRET (14 chiffres).");
      return;
    }

    if (!isValidPostalCode(form.postal_code)) {
      setError("Merci d’indiquer un code postal à 5 chiffres.");
      return;
    }

    if (!isValidEmail(form.email)) {
      setError("Merci d’indiquer une adresse email valide.");
      return;
    }

    if (form.phone.trim().length < 8) {
      setError("Merci d’indiquer un numéro de téléphone valide.");
      return;
    }

    if (!acceptedLegal) {
      setError(
        "Merci d’accepter les conditions et la politique de confidentialité pour continuer."
      );
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/public/partners/apply", {
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
          postal_code: normalizePostalCode(form.postal_code),
          city: form.city.trim(),
          email: form.email.trim().toLowerCase(),
        }),
      });

      const data = await res.json();
      console.log("Partner apply response:", data);

      if (!res.ok || !data.ok) {
        const errorMessages: Record<string, string> = {
          invalid_siret: "Merci d’indiquer un SIREN (9 chiffres) ou un SIRET (14 chiffres).",
          invalid_postal_code: "Merci d’indiquer un code postal à 5 chiffres.",
          invalid_email: "Merci d’indiquer une adresse email valide.",
        };
        setError(
          errorMessages[data?.error] ||
            data?.detail?.[0]?.msg ||
            "Une erreur est survenue. Merci de vérifier les informations."
        );
        return;
      }

      setLoadingProgress(100);
      await new Promise((resolve) => window.setTimeout(resolve, 350));
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

          {createdPartner.is_active ? (
            <div className="mt-6 rounded-3xl bg-emerald-50 border border-emerald-200 p-5">
              <p className="font-semibold text-emerald-800">
                ✅ Profil validé automatiquement
              </p>
              <p className="text-sm text-emerald-700 mt-2 leading-6">
                Votre dossier a été vérifié auprès du registre officiel des
                entreprises. Vous pouvez recevoir des demandes dès maintenant.
              </p>
            </div>
          ) : (
            <div className="mt-6 rounded-3xl bg-orange-50 border border-orange-200 p-5">
              <p className="font-semibold text-orange-800">
                ⏳ Validation en cours
              </p>
              <p className="text-sm text-orange-700 mt-2 leading-6">
                Votre profil a bien été créé. Nous vérifions la cohérence de
                votre dossier — l&apos;équipe Paulo confirmera sous peu si une
                vérification complémentaire est nécessaire. Vous pouvez contester
                une décision en nous contactant.
              </p>
            </div>
          )}

          <div className="mt-6 rounded-3xl bg-slate-50 border border-slate-200 p-5">
            <p className="text-sm font-semibold text-slate-700 mb-2">
              Votre lien partenaire
            </p>

            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-3 text-sm text-slate-600 break-all">
                {partnerUrl}
              </div>

              <button
                onClick={copyPartnerUrl}
                className="p-3 rounded-2xl bg-white border border-slate-200 hover:bg-slate-100 transition"
                title="Copier le lien"
              >
                📋
              </button>

              <button
                onClick={() =>
                  alert("Ajoutez cette page à vos favoris avec Ctrl+D ou Cmd+D")
                }
                className="p-3 rounded-2xl bg-white border border-slate-200 hover:bg-slate-100 transition"
                title="Ajouter aux favoris"
              >
                ⭐
              </button>
            </div>

            {copied && (
              <p className="text-xs text-emerald-600 mt-2">
                Lien copié ✅
              </p>
            )}

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
            votre activité. Chaque partenaire est validé pour garantir un réseau
            fiable — votre SIRET est contrôlé auprès du registre officiel des
            entreprises.
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
          <div className="relative bg-white border border-slate-200 rounded-[32px] shadow-sm p-6 space-y-5">
            {loading && (
              <PartnerApplyLoadingOverlay
                stepIndex={loadingStep}
                progress={loadingProgress}
              />
            )}

            <fieldset
              disabled={loading}
              className={`space-y-5 border-0 p-0 m-0 min-w-0 ${
                loading ? "opacity-40 pointer-events-none" : ""
              }`}
            >
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
              <label className="block text-sm font-semibold mb-2">
                SIREN ou SIRET
              </label>
              <input
                value={form.siret}
                onChange={(e) => updateField("siret", e.target.value)}
                className="w-full border border-slate-200 rounded-2xl px-4 py-3"
                placeholder="SIREN 9 chiffres ou SIRET 14 chiffres"
                inputMode="numeric"
              />
              <p className="text-xs text-slate-500 mt-2 leading-5">
                {PARTNER_FORM_SIRET_NOTICE}
              </p>
              {form.siret.trim() && (
                <p className="text-xs text-blue-600 mt-1">
                  {companyIdentifierHint(form.siret)}
                </p>
              )}
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
                Adresse (numéro et rue)
              </label>
              <input
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
                className="w-full border border-slate-200 rounded-2xl px-4 py-3"
                placeholder="Ex : 12 rue de la Mairie"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Code postal
                </label>
                <input
                  value={form.postal_code}
                  onChange={(e) =>
                    updateField("postal_code", normalizePostalCode(e.target.value))
                  }
                  className="w-full border border-slate-200 rounded-2xl px-4 py-3"
                  placeholder="07120"
                  inputMode="numeric"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Ville</label>
                <input
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  className="w-full border border-slate-200 rounded-2xl px-4 py-3"
                  placeholder="Saint-Paul-le-Jeune"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                className="w-full border border-slate-200 rounded-2xl px-4 py-3"
                placeholder="contact@mon-entreprise.fr"
                autoComplete="email"
              />
              <p className="text-xs text-slate-400 mt-2">
                Pour vous contacter et confirmer votre inscription.
              </p>
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
                    {subtypeLabel(subtype)}
                  </option>
                ))}
              </select>
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-4">
              <p className="text-xs text-slate-600 leading-5">
                {PARTNER_FORM_VALIDATION_NOTICE}
              </p>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedLegal}
                  onChange={(e) => setAcceptedLegal(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm text-slate-700 leading-6">
                  J&apos;accepte les{" "}
                  <Link
                    href="/legal/cgu-partenaires"
                    className="font-semibold text-blue-600 hover:underline"
                    target="_blank"
                  >
                    conditions générales partenaires
                  </Link>{" "}
                  et la{" "}
                  <Link
                    href="/legal/confidentialite-partenaires"
                    className="font-semibold text-blue-600 hover:underline"
                    target="_blank"
                  >
                    politique de confidentialité
                  </Link>
                  , et j&apos;autorise Paulo à vérifier mon SIRET auprès du
                  registre public des entreprises.
                </span>
              </label>
            </div>

            <button
              type="button"
              onClick={submit}
              disabled={loading || !acceptedLegal}
              className="w-full bg-slate-950 hover:bg-slate-800 text-white px-5 py-3 rounded-2xl font-semibold disabled:bg-slate-400 disabled:cursor-not-allowed"
            >
              {loading ? "Vérification en cours…" : "Créer mon profil partenaire"}
            </button>
            </fieldset>
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
                <p className="font-semibold">2. Vérification du dossier</p>
                <p className="text-xs text-slate-400 mt-1">
                  SIRET contrôlé via le registre officiel ; revue humaine si
                  doute.
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