"use client";

import { useCallback, useEffect, useState } from "react";

import { lcFetch } from "@/lib/lifecycle-copilot/api";
import type { LcMappingSummary } from "@/lib/lifecycle-copilot/types/analysis";

type MappingPanelProps = {
  projectId: number;
  refreshKey?: number;
};

export default function MappingPanel({ projectId, refreshKey = 0 }: MappingPanelProps) {
  const [summary, setSummary] = useState<LcMappingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await lcFetch(`/v1/projects/${projectId}/mapping`);
      setSummary(await response.json());
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  async function rerunMapping() {
    setRunning(true);
    try {
      await lcFetch(`/v1/projects/${projectId}/mapping/run`, { method: "POST" });
      await load();
    } finally {
      setRunning(false);
    }
  }

  if (loading) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-500">Chargement mapping…</div>;
  }

  if (!summary) return null;

  const mapped = summary.matches.filter((match) => match.dictionary_entry_id);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Couverture</p>
          <p className="text-3xl font-bold mt-2 text-teal-700">{summary.coverage_percent}%</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Mappées</p>
          <p className="text-3xl font-bold mt-2">{summary.mapped_columns}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Non mappées</p>
          <p className="text-3xl font-bold mt-2">{summary.unmapped_columns}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Doc absente des exports</p>
          <p className="text-3xl font-bold mt-2">{summary.missing_dictionary_columns}</p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={rerunMapping}
          disabled={running}
          className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {running ? "Mapping…" : "Relancer le mapping auto"}
        </button>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm overflow-x-auto">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Correspondances doc ↔ exports</h3>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-100">
              <th className="py-2 pr-4">Colonne export</th>
              <th className="py-2 pr-4">Dictionnaire</th>
              <th className="py-2 pr-4">Confiance</th>
              <th className="py-2">Méthode</th>
            </tr>
          </thead>
          <tbody>
            {mapped.slice(0, 150).map((match) => (
              <tr key={match.dataset_column_id} className="border-b border-slate-50">
                <td className="py-2 pr-4 font-medium">{match.dataset_column_name}</td>
                <td className="py-2 pr-4">
                  {match.dictionary_table_name}.{match.dictionary_column_name}
                </td>
                <td className="py-2 pr-4">{match.confidence ?? "—"}</td>
                <td className="py-2 text-slate-600">{match.method ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
