"use client";

import { useCallback, useEffect, useState } from "react";

import { lcFetch } from "@/lib/lifecycle-copilot/api";
import type { LcQualityReport } from "@/lib/lifecycle-copilot/types/analysis";

const SEVERITY_CLASS: Record<string, string> = {
  critical: "bg-red-100 text-red-800",
  warning: "bg-amber-100 text-amber-800",
  info: "bg-slate-100 text-slate-700",
};

type QualityPanelProps = {
  projectId: number;
  refreshKey?: number;
};

export default function QualityPanel({ projectId, refreshKey = 0 }: QualityPanelProps) {
  const [report, setReport] = useState<LcQualityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await lcFetch(`/v1/projects/${projectId}/quality`);
      setReport(await response.json());
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  async function recompute() {
    setComputing(true);
    try {
      const response = await lcFetch(`/v1/projects/${projectId}/quality/compute`, {
        method: "POST",
      });
      setReport(await response.json());
    } finally {
      setComputing(false);
    }
  }

  if (loading) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-500">Chargement qualité…</div>;
  }

  if (!report) return null;

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-slate-500">Score qualité data</p>
          <p className="text-5xl font-bold text-slate-900 mt-2">{report.overall_score}/100</p>
          <p className="text-sm text-slate-500 mt-2">{report.summary}</p>
        </div>
        <button
          type="button"
          onClick={recompute}
          disabled={computing}
          className="rounded-2xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {computing ? "Calcul…" : "Recalculer"}
        </button>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Alertes ({report.alert_count})
        </h3>
        {report.alerts.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune alerte détectée.</p>
        ) : (
          <div className="space-y-3">
            {report.alerts.slice(0, 100).map((alert, index) => (
              <div
                key={`${alert.code}-${index}`}
                className="rounded-2xl border border-slate-100 px-4 py-3 flex flex-wrap items-start gap-3"
              >
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${
                    SEVERITY_CLASS[alert.severity] || SEVERITY_CLASS.info
                  }`}
                >
                  {alert.severity}
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-900">{alert.message}</p>
                  <p className="text-xs text-slate-500 mt-1">{alert.code}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
