"use client";

import { useCallback, useEffect, useState } from "react";

import { lcFetch } from "@/lib/lifecycle-copilot/api";
import type { LcRecommendationsReport, LcSynthesisReport } from "@/lib/lifecycle-copilot/types/analysis";

type InsightsPanelProps = {
  projectId: number;
  refreshKey?: number;
};

function renderMarkdown(content: string) {
  return content.split("\n").map((line, index) => {
    if (line.startsWith("# ")) {
      return (
        <h2 key={index} className="text-2xl font-bold text-slate-900 mt-6 mb-3">
          {line.slice(2)}
        </h2>
      );
    }
    if (line.startsWith("## ")) {
      return (
        <h3 key={index} className="text-lg font-semibold text-slate-900 mt-5 mb-2">
          {line.slice(3)}
        </h3>
      );
    }
    if (line.startsWith("- ")) {
      return (
        <p key={index} className="text-sm text-slate-700 leading-6 ml-4">
          • {line.slice(2)}
        </p>
      );
    }
    if (!line.trim()) {
      return <div key={index} className="h-2" />;
    }
    return (
      <p key={index} className="text-sm text-slate-700 leading-6">
        {line}
      </p>
    );
  });
}

export default function InsightsPanel({ projectId, refreshKey = 0 }: InsightsPanelProps) {
  const [synthesis, setSynthesis] = useState<LcSynthesisReport | null>(null);
  const [recommendations, setRecommendations] = useState<LcRecommendationsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [synthesisResponse, recommendationsResponse] = await Promise.all([
        lcFetch(`/v1/projects/${projectId}/insights/synthesis`),
        lcFetch(`/v1/projects/${projectId}/insights/recommendations`),
      ]);
      setSynthesis(await synthesisResponse.json());
      setRecommendations(await recommendationsResponse.json());
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  async function regenerateAll() {
    setGenerating(true);
    try {
      await Promise.all([
        lcFetch(`/v1/projects/${projectId}/insights/synthesis`, { method: "POST" }),
        lcFetch(`/v1/projects/${projectId}/insights/recommendations`, { method: "POST" }),
      ]);
      await load();
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-500">Chargement synthèse…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={regenerateAll}
          disabled={generating}
          className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {generating ? "Génération…" : "Régénérer synthèse + recommandations"}
        </button>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Synthèse consultant</h3>
          {synthesis?.generated_by ? (
            <span className="text-xs rounded-full bg-teal-50 text-teal-700 px-3 py-1 font-semibold">
              {synthesis.generated_by === "openai" ? "IA" : "Règles"}
            </span>
          ) : null}
        </div>
        <div className="prose prose-slate max-w-none">
          {synthesis?.content_markdown
            ? renderMarkdown(synthesis.content_markdown)
            : "Aucune synthèse disponible."}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Recommandations lifecycle ({recommendations?.recommendation_count ?? 0})
        </h3>
        <div className="space-y-4">
          {(recommendations?.recommendations || []).map((item, index) => (
            <div key={`${item.title}-${index}`} className="rounded-2xl border border-slate-100 p-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="rounded-full bg-slate-900 text-white text-xs font-semibold px-2.5 py-1">
                  {item.category}
                </span>
                <span className="rounded-full bg-teal-50 text-teal-700 text-xs font-semibold px-2.5 py-1">
                  {item.priority}
                </span>
              </div>
              <p className="font-semibold text-slate-900">{item.title}</p>
              <p className="text-sm text-slate-600 mt-1">{item.detail}</p>
              <p className="text-sm text-teal-800 mt-2">{item.action}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
