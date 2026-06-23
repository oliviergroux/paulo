"use client";

import { FormEvent, useEffect, useState } from "react";
import AuthenticatedShell from "@/components/AuthenticatedShell";
import EmptyState from "@/components/EmptyState";
import KpiCard from "@/components/KpiCard";
import PageHeader from "@/components/PageHeader";
import { adminFetch } from "@/lib/api";
import type { CommuneItem } from "@/lib/types";

export default function CommunesPage() {
  const [communes, setCommunes] = useState<CommuneItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    postal_code: "",
    department: "",
  });

  const fetchCommunes = async () => {
    const res = await adminFetch("/communes");
    if (res.ok) {
      setCommunes(await res.json());
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCommunes();
  }, []);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setCreating(true);
    setError("");

    const res = await adminFetch("/communes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        postal_code: form.postal_code.trim(),
        department: form.department.trim() || null,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError("Impossible de créer la commune.");
      setCreating(false);
      return;
    }

    if (data.commune) {
      setCommunes((prev) =>
        [...prev, data.commune].sort((a, b) => a.name.localeCompare(b.name))
      );
    } else {
      fetchCommunes();
    }

    setForm({ name: "", postal_code: "", department: "" });
    setCreating(false);
  };

  const toggleActive = async (commune: CommuneItem) => {
    const res = await adminFetch(`/communes/${commune.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !commune.is_active }),
    });

    if (!res.ok) return;

    const data = await res.json();
    if (data.commune) {
      setCommunes((prev) =>
        prev.map((item) => (item.id === commune.id ? { ...item, ...data.commune } : item))
      );
    }
  };

  const activeCount = communes.filter((commune) => commune.is_active).length;
  const totalRequests = communes.reduce(
    (sum, commune) => sum + Number(commune.total_requests || 0),
    0
  );
  const totalPartners = communes.reduce(
    (sum, commune) => sum + Number(commune.partners_count || 0),
    0
  );

  return (
    <AuthenticatedShell
      activeNav="communes"
      sidebarNote={{
        title: "Territoires",
        description:
          "Chaque commune isole demandes, partenaires et accès mairie.",
      }}
    >
      <PageHeader
        eyebrow="Administration"
        title="Communes"
        description="Gérez les territoires couverts par Paulo et le routage des demandes."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <KpiCard label="Communes actives" value={activeCount} variant="emerald" />
        <KpiCard label="Demandes totales" value={totalRequests} variant="blue" />
        <KpiCard label="Partenaires" value={totalPartners} variant="slate" />
      </div>

      <form
        onSubmit={handleCreate}
        className="mb-8 rounded-[28px] bg-white border border-slate-200 shadow-sm p-6 space-y-4"
      >
        <p className="text-sm font-semibold text-slate-900">Ajouter une commune</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={form.name}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, name: event.target.value }))
            }
            placeholder="Nom de la commune"
            required
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          />
          <input
            value={form.postal_code}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, postal_code: event.target.value }))
            }
            placeholder="Code postal"
            required
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          />
          <input
            value={form.department}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, department: event.target.value }))
            }
            placeholder="Département (optionnel)"
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={creating}
          className="rounded-2xl bg-slate-950 text-white px-5 py-3 text-sm font-semibold hover:bg-slate-800 disabled:opacity-60"
        >
          {creating ? "Création..." : "Créer la commune"}
        </button>
      </form>

      {loading ? (
        <p className="text-slate-500">Chargement...</p>
      ) : communes.length === 0 ? (
        <EmptyState message="Aucune commune configurée." />
      ) : (
        <div className="space-y-4">
          {communes.map((commune) => (
            <article
              key={commune.id}
              className="rounded-[28px] border border-slate-200 bg-white shadow-sm p-6"
            >
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h2 className="text-xl font-bold text-slate-950">
                      {commune.name}
                    </h2>
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full ${
                        commune.is_active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {commune.is_active ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">
                    {commune.postal_code}
                    {commune.department ? ` · ${commune.department}` : ""}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3 text-sm">
                    <span className="rounded-full bg-slate-50 border border-slate-200 px-3 py-1">
                      {Number(commune.active_requests || 0)} demande
                      {Number(commune.active_requests || 0) > 1 ? "s" : ""} active
                      {Number(commune.active_requests || 0) > 1 ? "s" : ""}
                    </span>
                    <span className="rounded-full bg-slate-50 border border-slate-200 px-3 py-1">
                      {Number(commune.total_requests || 0)} demande
                      {Number(commune.total_requests || 0) > 1 ? "s" : ""} au total
                    </span>
                    <span className="rounded-full bg-slate-50 border border-slate-200 px-3 py-1">
                      {Number(commune.partners_count || 0)} partenaire
                      {Number(commune.partners_count || 0) > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleActive(commune)}
                  className={`rounded-2xl px-5 py-3 text-sm font-semibold transition ${
                    commune.is_active
                      ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      : "bg-emerald-600 text-white hover:bg-emerald-700"
                  }`}
                >
                  {commune.is_active ? "Désactiver" : "Activer"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </AuthenticatedShell>
  );
}
