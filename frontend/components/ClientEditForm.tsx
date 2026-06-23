"use client";

import { useState } from "react";
import type { ClientItem } from "@/lib/types";

type ClientEditFormProps = {
  client: ClientItem;
  onSave: (data: {
    first_name: string | null;
    last_name: string | null;
    address: string | null;
  }) => Promise<void>;
};

export default function ClientEditForm({ client, onSave }: ClientEditFormProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    first_name: client.first_name || "",
    last_name: client.last_name || "",
    address: client.address || "",
  });

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await onSave({
        first_name: form.first_name.trim() || null,
        last_name: form.last_name.trim() || null,
        address: form.address.trim() || null,
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
        Modifier la fiche
      </button>
    );
  }

  return (
    <div className="rounded-3xl border border-blue-200 bg-blue-50/40 p-5 space-y-4">
      <p className="text-sm font-semibold text-slate-900">Modifier le contact</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          value={form.first_name}
          onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
          placeholder="Prénom"
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
        />
        <input
          value={form.last_name}
          onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
          placeholder="Nom"
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
        />
        <input
          value={form.address}
          onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          placeholder="Adresse"
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm md:col-span-2"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

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
          onClick={() => {
            setEditing(false);
            setForm({
              first_name: client.first_name || "",
              last_name: client.last_name || "",
              address: client.address || "",
            });
          }}
          className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold hover:bg-slate-50"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
