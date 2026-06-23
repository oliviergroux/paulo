"use client";

import { useEffect, useState } from "react";
import type { CommuneItem, PartnerDetail } from "@/lib/types";
import { SUBTYPES, subtypeLabel } from "@/lib/taxonomy";
import { adminFetch } from "@/lib/api";

type PartnerEditFormProps = {
  partner: PartnerDetail;
  onSave: (data: {
    name: string;
    siret: string;
    phone: string;
    address: string;
    category: string;
    subtype: string;
    commune_id?: number | null;
  }) => Promise<void>;
};

export default function PartnerEditForm({
  partner,
  onSave,
}: PartnerEditFormProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [communes, setCommunes] = useState<CommuneItem[]>([]);
  const [form, setForm] = useState({
    name: partner.name || "",
    siret: partner.siret || "",
    phone: partner.phone || "",
    address: partner.address || "",
    category: partner.category || "commerce",
    subtype: partner.subtype || "",
    commune_id: partner.commune_id != null ? String(partner.commune_id) : "",
  });

  const subtypes = SUBTYPES[form.category] || [];

  useEffect(() => {
    if (!editing) return;

    adminFetch("/communes")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setCommunes(data);
      })
      .catch(() => {});
  }, [editing]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await onSave({
        name: form.name.trim(),
        siret: form.siret.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        category: form.category,
        subtype: form.subtype,
        commune_id: form.commune_id ? Number(form.commune_id) : null,
      });
      setEditing(false);
    } catch {
      setError("Impossible d'enregistrer les modifications.");
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="rounded-2xl border border-slate-200 bg-white text-slate-700 px-5 py-3 text-sm font-semibold hover:bg-slate-50 transition"
      >
        Modifier le partenaire
      </button>
    );
  }

  return (
    <div className="rounded-3xl border border-blue-200 bg-blue-50/40 p-5 space-y-4">
      <p className="text-sm font-semibold text-slate-900">
        Modifier la fiche partenaire
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Nom"
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm md:col-span-2"
        />
        <input
          value={form.siret}
          onChange={(e) => setForm((f) => ({ ...f, siret: e.target.value }))}
          placeholder="SIRET"
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
        />
        <input
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          placeholder="Téléphone"
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
        />
        <select
          value={form.category}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              category: e.target.value,
              subtype: "",
            }))
          }
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
        >
          <option value="commerce">Commerce</option>
          <option value="service_local">Service local</option>
          <option value="transport">Transport</option>
        </select>
        <select
          value={form.subtype}
          onChange={(e) => setForm((f) => ({ ...f, subtype: e.target.value }))}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
        >
          <option value="">Sous-type</option>
          {subtypes.map((st) => (
            <option key={st} value={st}>
              {subtypeLabel(st)}
            </option>
          ))}
        </select>
        {communes.length > 0 && (
          <select
            value={form.commune_id}
            onChange={(e) =>
              setForm((f) => ({ ...f, commune_id: e.target.value }))
            }
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm md:col-span-2"
          >
            <option value="">Commune (auto depuis l'adresse si vide)</option>
            {communes.map((commune) => (
              <option key={commune.id} value={commune.id}>
                {commune.name} ({commune.postal_code})
              </option>
            ))}
          </select>
        )}
        <input
          value={form.address}
          onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          placeholder="Adresse"
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm md:col-span-2"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="rounded-2xl bg-slate-950 text-white px-5 py-2.5 text-sm font-semibold hover:bg-slate-800 disabled:opacity-60"
        >
          {saving ? "Enregistrement..." : "Enregistrer"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => setEditing(false)}
          className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold hover:bg-slate-50"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
