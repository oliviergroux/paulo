"use client";

import { FormEvent, useEffect, useState } from "react";
import AuthenticatedShell from "@/components/AuthenticatedShell";
import DepartmentSelect from "@/components/DepartmentSelect";
import EmptyState from "@/components/EmptyState";
import KpiCard from "@/components/KpiCard";
import PageHeader from "@/components/PageHeader";
import { adminFetch } from "@/lib/api";
import { formatDepartment } from "@/lib/departments";
import type { CommuneItem } from "@/lib/types";

type CommuneFormState = {
  name: string;
  postal_code: string;
  department_code: string;
  department_label: string;
  email: string;
  phone: string;
};

const emptyForm = (): CommuneFormState => ({
  name: "",
  postal_code: "",
  department_code: "",
  department_label: "",
  email: "",
  phone: "",
});

function communeToForm(commune: CommuneItem): CommuneFormState {
  return {
    name: commune.name,
    postal_code: commune.postal_code,
    department_code: commune.department_code || "",
    department_label: commune.department_label || "",
    email: commune.email || "",
    phone: commune.phone || "",
  };
}

export default function CommunesPage() {
  const [communes, setCommunes] = useState<CommuneItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState<CommuneFormState>(emptyForm());
  const [editForm, setEditForm] = useState<CommuneFormState>(emptyForm());

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

  const buildPayload = (state: CommuneFormState) => ({
    name: state.name.trim(),
    postal_code: state.postal_code.trim(),
    department_code: state.department_code || null,
    department_label: state.department_label || null,
    email: state.email.trim() || null,
    phone: state.phone.trim() || null,
  });

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setCreating(true);
    setError("");

    const res = await adminFetch("/communes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload(form)),
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

    setForm(emptyForm());
    setCreating(false);
  };

  const startEdit = (commune: CommuneItem) => {
    setEditingId(commune.id);
    setEditForm(communeToForm(commune));
    setError("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(emptyForm());
    setError("");
  };

  const saveEdit = async (communeId: number) => {
    setSavingId(communeId);
    setError("");

    const res = await adminFetch(`/communes/${communeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload(editForm)),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError("Impossible de mettre à jour la commune.");
      setSavingId(null);
      return;
    }

    if (data.commune) {
      setCommunes((prev) =>
        prev.map((item) =>
          item.id === communeId
            ? {
                ...item,
                ...data.commune,
                total_requests: item.total_requests,
                active_requests: item.active_requests,
                partners_count: item.partners_count,
              }
            : item
        )
      );
    }

    setEditingId(null);
    setSavingId(null);
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
        prev.map((item) =>
          item.id === commune.id
            ? {
                ...item,
                is_active: data.commune.is_active,
              }
            : item
        )
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
          <DepartmentSelect
            value={form.department_code}
            onChange={(code, label) =>
              setForm((prev) => ({
                ...prev,
                department_code: code,
                department_label: label,
              }))
            }
          />
          <input
            value={form.email}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, email: event.target.value }))
            }
            placeholder="Email de la mairie"
            type="email"
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          />
          <input
            value={form.phone}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, phone: event.target.value }))
            }
            placeholder="Téléphone de la mairie"
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm md:col-span-2"
          />
        </div>
        {error && editingId === null && (
          <p className="text-sm text-red-600">{error}</p>
        )}
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
          {communes.map((commune) => {
            const departmentText = formatDepartment(
              commune.department_code,
              commune.department_label
            );
            const isEditing = editingId === commune.id;

            return (
              <article
                key={commune.id}
                className="rounded-[28px] border border-slate-200 bg-white shadow-sm p-6"
              >
                {isEditing ? (
                  <div className="space-y-4">
                    <p className="text-sm font-semibold text-slate-900">
                      Modifier {commune.name}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        value={editForm.name}
                        onChange={(event) =>
                          setEditForm((prev) => ({
                            ...prev,
                            name: event.target.value,
                          }))
                        }
                        placeholder="Nom de la commune"
                        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                      />
                      <input
                        value={editForm.postal_code}
                        onChange={(event) =>
                          setEditForm((prev) => ({
                            ...prev,
                            postal_code: event.target.value,
                          }))
                        }
                        placeholder="Code postal"
                        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                      />
                      <DepartmentSelect
                        value={editForm.department_code}
                        onChange={(code, label) =>
                          setEditForm((prev) => ({
                            ...prev,
                            department_code: code,
                            department_label: label,
                          }))
                        }
                      />
                      <input
                        value={editForm.email}
                        onChange={(event) =>
                          setEditForm((prev) => ({
                            ...prev,
                            email: event.target.value,
                          }))
                        }
                        placeholder="Email de la mairie"
                        type="email"
                        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                      />
                      <input
                        value={editForm.phone}
                        onChange={(event) =>
                          setEditForm((prev) => ({
                            ...prev,
                            phone: event.target.value,
                          }))
                        }
                        placeholder="Téléphone de la mairie"
                        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm md:col-span-2"
                      />
                    </div>
                    {error && (
                      <p className="text-sm text-red-600">{error}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={savingId === commune.id}
                        onClick={() => saveEdit(commune.id)}
                        className="rounded-2xl bg-slate-950 text-white px-5 py-3 text-sm font-semibold hover:bg-slate-800 disabled:opacity-60"
                      >
                        {savingId === commune.id
                          ? "Enregistrement..."
                          : "Enregistrer"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold hover:bg-slate-50"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
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
                        {departmentText ? ` · ${departmentText}` : ""}
                      </p>
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                          <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold">
                            Email
                          </p>
                          <p className="font-medium text-slate-900 mt-1">
                            {commune.email || "Non renseigné"}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                          <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold">
                            Téléphone
                          </p>
                          <p className="font-medium text-slate-900 mt-1">
                            {commune.phone || "Non renseigné"}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-3 text-sm">
                        <span className="rounded-full bg-slate-50 border border-slate-200 px-3 py-1">
                          {Number(commune.active_requests || 0)} demande
                          {Number(commune.active_requests || 0) > 1 ? "s" : ""}{" "}
                          active
                          {Number(commune.active_requests || 0) > 1 ? "s" : ""}
                        </span>
                        <span className="rounded-full bg-slate-50 border border-slate-200 px-3 py-1">
                          {Number(commune.total_requests || 0)} demande
                          {Number(commune.total_requests || 0) > 1 ? "s" : ""} au
                          total
                        </span>
                        <span className="rounded-full bg-slate-50 border border-slate-200 px-3 py-1">
                          {Number(commune.partners_count || 0)} partenaire
                          {Number(commune.partners_count || 0) > 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEdit(commune)}
                        className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Modifier
                      </button>
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
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </AuthenticatedShell>
  );
}
