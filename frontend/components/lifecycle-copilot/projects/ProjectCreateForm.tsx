"use client";

import { useState } from "react";

type ProjectCreateFormProps = {
  onCreated: () => void;
};

export default function ProjectCreateForm({ onCreated }: ProjectCreateFormProps) {
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [crmPlatform, setCrmPlatform] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/lifecycle-copilot/v1/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          client_name: clientName || null,
          crm_platform: crmPlatform || null,
          description: description || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "Impossible de créer le projet");
      }

      setName("");
      setClientName("");
      setCrmPlatform("");
      setDescription("");
      onCreated();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Nouveau projet</h2>
        <p className="text-sm text-slate-500 mt-1">
          Client, CRM et description pour cadrer l&apos;audit lifecycle.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Nom du projet</span>
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3"
            placeholder="Audit CRM Acme"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Client</span>
          <input
            value={clientName}
            onChange={(event) => setClientName(event.target.value)}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3"
            placeholder="Acme Corp"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Plateforme CRM</span>
          <input
            value={crmPlatform}
            onChange={(event) => setCrmPlatform(event.target.value)}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3"
            placeholder="Salesforce, HubSpot…"
          />
        </label>
        <label className="block text-sm md:col-span-2">
          <span className="font-medium text-slate-700">Description</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 min-h-24"
            placeholder="Contexte, périmètre, objectifs…"
          />
        </label>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="rounded-2xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
      >
        {loading ? "Création…" : "Créer le projet"}
      </button>
    </form>
  );
}
