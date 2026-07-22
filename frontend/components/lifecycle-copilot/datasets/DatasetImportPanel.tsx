"use client";

import { useState } from "react";

import { lcUpload, readLcError } from "@/lib/lifecycle-copilot/api";
import type { LcDatasetDetail } from "@/lib/lifecycle-copilot/types/project";

type DatasetImportPanelProps = {
  projectId: number;
  onImported: (dataset: LcDatasetDetail) => void;
};

export default function DatasetImportPanel({
  projectId,
  onImported,
}: DatasetImportPanelProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("datasetFile") as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) {
      setError("Choisissez un fichier CSV ou XLSX.");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    if (name.trim()) {
      formData.append("name", name.trim());
    }

    try {
      const response = await lcUpload(
        `/v1/projects/${projectId}/datasets/import`,
        formData
      );
      if (!response.ok) {
        throw new Error(await readLcError(response));
      }
      const dataset = (await response.json()) as LcDatasetDetail;
      setName("");
      fileInput.value = "";
      onImported(dataset);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Import impossible");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Import dataset</h3>
        <p className="text-sm text-slate-500 mt-1">
          Fichier tabulaire client. Profilage automatique à l&apos;import.
        </p>
      </div>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Nom affiché (optionnel)</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3"
          placeholder="Export contacts Q1"
        />
      </label>

      <input
        name="datasetFile"
        type="file"
        accept=".csv,.xlsx"
        className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-2xl file:border-0 file:bg-teal-50 file:px-4 file:py-2 file:font-semibold file:text-teal-700"
      />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="rounded-2xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
      >
        {loading ? "Import + profilage…" : "Importer le dataset"}
      </button>
    </form>
  );
}
