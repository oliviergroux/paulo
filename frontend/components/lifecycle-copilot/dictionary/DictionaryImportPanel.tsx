"use client";

import { useState } from "react";

import { lcUpload, readLcError } from "@/lib/lifecycle-copilot/api";
import type { LcDictionaryImportResult } from "@/lib/lifecycle-copilot/types/project";

type DictionaryImportPanelProps = {
  projectId: number;
  onImported: () => void;
};

export default function DictionaryImportPanel({
  projectId,
  onImported,
}: DictionaryImportPanelProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("dictionaryFile") as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) {
      setError("Choisissez un fichier CSV ou XLSX.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await lcUpload(
        `/v1/projects/${projectId}/dictionary/import`,
        formData
      );
      if (!response.ok) {
        throw new Error(await readLcError(response));
      }
      const result = (await response.json()) as LcDictionaryImportResult;
      setMessage(
        `${result.imported_rows} lignes importées · ${result.table_count} tables · ${result.column_count} colonnes`
      );
      fileInput.value = "";
      onImported();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Import impossible");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Import dictionnaire</h3>
        <p className="text-sm text-slate-500 mt-1">
          Colonnes attendues : table_name, column_name, data_type, description, clés PK/FK.
        </p>
      </div>

      <input
        name="dictionaryFile"
        type="file"
        accept=".csv,.xlsx"
        className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-2xl file:border-0 file:bg-teal-50 file:px-4 file:py-2 file:font-semibold file:text-teal-700"
      />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-teal-700">{message}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {loading ? "Import…" : "Importer le dictionnaire"}
      </button>
    </form>
  );
}
