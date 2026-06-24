"use client";

import { useState } from "react";
import type { ClientEditPayload, ClientItem } from "@/lib/types";

type ClientEditFormProps = {
  client: ClientItem;
  onSave: (data: ClientEditPayload) => Promise<void>;
};

function parseStoredDate(iso?: string | null): Date | null {
  if (!iso) return null;
  const parsed = new Date(iso.endsWith("Z") || iso.includes("+") ? iso : `${iso}Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toDatetimeLocalValue(iso?: string | null): string {
  const parsed = parseStoredDate(iso);
  if (!parsed) return "";

  const pad = (value: number) => String(value).padStart(2, "0");
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}

function fromDatetimeLocalValue(value: string): string | null {
  if (!value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function buildForm(client: ClientItem) {
  return {
    first_name: client.first_name || "",
    last_name: client.last_name || "",
    address: client.address || "",
    email: client.email || "",
    opt_in_email: Boolean(client.opt_in_email),
    opt_in_sms: Boolean(client.opt_in_sms),
    opt_in_email_at: toDatetimeLocalValue(client.opt_in_email_at),
    opt_in_sms_at: toDatetimeLocalValue(client.opt_in_sms_at),
  };
}

export default function ClientEditForm({ client, onSave }: ClientEditFormProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(() => buildForm(client));

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await onSave({
        first_name: form.first_name.trim() || null,
        last_name: form.last_name.trim() || null,
        address: form.address.trim() || null,
        email: form.email.trim().toLowerCase() || null,
        opt_in_email: form.opt_in_email,
        opt_in_sms: form.opt_in_sms,
        opt_in_email_at: fromDatetimeLocalValue(form.opt_in_email_at),
        opt_in_sms_at: fromDatetimeLocalValue(form.opt_in_sms_at),
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
        onClick={() => {
          setForm(buildForm(client));
          setError("");
          setEditing(true);
        }}
        className="rounded-2xl border border-slate-200 bg-white text-slate-700 px-5 py-3 text-sm font-semibold hover:bg-slate-50 transition"
      >
        Modifier la fiche
      </button>
    );
  }

  return (
    <div className="rounded-3xl border border-blue-200 bg-blue-50/40 p-5 space-y-4 w-full max-w-3xl">
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
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="Email"
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm md:col-span-2"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Consentements
        </p>

        <label className="flex items-start gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.opt_in_email}
            onChange={(e) =>
              setForm((f) => ({ ...f, opt_in_email: e.target.checked }))
            }
            className="mt-1 h-4 w-4 rounded border-slate-300"
          />
          <span>
            <span className="font-medium text-slate-900">Opt-in email</span>
            <span className="block text-slate-500 text-xs mt-1">
              Autorisation de contact par email.
            </span>
          </span>
        </label>

        <label className="block text-sm text-slate-700">
          <span className="font-medium text-slate-900">Date opt-in email</span>
          <input
            type="datetime-local"
            value={form.opt_in_email_at}
            onChange={(e) =>
              setForm((f) => ({ ...f, opt_in_email_at: e.target.value }))
            }
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
          />
        </label>

        <label className="flex items-start gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.opt_in_sms}
            onChange={(e) =>
              setForm((f) => ({ ...f, opt_in_sms: e.target.checked }))
            }
            className="mt-1 h-4 w-4 rounded border-slate-300"
          />
          <span>
            <span className="font-medium text-slate-900">Opt-in SMS</span>
            <span className="block text-slate-500 text-xs mt-1">
              Autorisation de contact par SMS.
            </span>
          </span>
        </label>

        <label className="block text-sm text-slate-700">
          <span className="font-medium text-slate-900">Date opt-in SMS</span>
          <input
            type="datetime-local"
            value={form.opt_in_sms_at}
            onChange={(e) =>
              setForm((f) => ({ ...f, opt_in_sms_at: e.target.value }))
            }
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
          />
        </label>
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
          onClick={() => {
            setEditing(false);
            setForm(buildForm(client));
            setError("");
          }}
          className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold hover:bg-slate-50"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
