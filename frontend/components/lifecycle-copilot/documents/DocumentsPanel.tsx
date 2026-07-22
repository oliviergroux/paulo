"use client";

import { useCallback, useEffect, useState } from "react";

import { lcFetch, lcUpload, readLcError } from "@/lib/lifecycle-copilot/api";
import type { LcDocumentAnalysis, LcDocumentSummary } from "@/lib/lifecycle-copilot/types/documents";

type DocumentsPanelProps = {
  projectId: number;
};

function formatBytes(value: number) {
  if (value < 1024) return `${value} o`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} Ko`;
  return `${(value / (1024 * 1024)).toFixed(1)} Mo`;
}

export default function DocumentsPanel({ projectId }: DocumentsPanelProps) {
  const [documents, setDocuments] = useState<LcDocumentSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<LcDocumentAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await lcFetch(`/v1/projects/${projectId}/documents`);
      const items = (await response.json()) as LcDocumentSummary[];
      setDocuments(items);
      setSelectedId((current) => current ?? items[0]?.id ?? null);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selectedId) {
      setAnalysis(null);
      return;
    }
    lcFetch(`/v1/projects/${projectId}/documents/${selectedId}/analysis`)
      .then((response) => response.json())
      .then(setAnalysis)
      .catch(() => setAnalysis(null));
  }, [projectId, selectedId]);

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("pdfFile") as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) {
      setError("Choisissez un PDF.");
      return;
    }

    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    if (name.trim()) formData.append("name", name.trim());
    formData.append("doc_type", "appel_offre");

    try {
      const response = await lcUpload(`/v1/projects/${projectId}/documents/import`, formData);
      if (!response.ok) throw new Error(await readLcError(response));
      setName("");
      fileInput.value = "";
      await load();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Import impossible");
    } finally {
      setUploading(false);
    }
  }

  async function runAnalysis() {
    if (!selectedId) return;
    setAnalyzing(true);
    try {
      const response = await lcFetch(
        `/v1/projects/${projectId}/documents/${selectedId}/analyze`,
        { method: "POST" }
      );
      setAnalysis(await response.json());
    } finally {
      setAnalyzing(false);
    }
  }

  if (loading) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-500">Chargement documents…</div>;
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-6">
      <div className="space-y-6">
        <form onSubmit={handleUpload} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Import appel d&apos;offre (PDF)</h3>
            <p className="text-sm text-slate-500 mt-1">
              Extraction texte, indexation RAG (embeddings OpenAI) et analyse AO.
            </p>
          </div>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nom affiché (optionnel)"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          />
          <input
            name="pdfFile"
            type="file"
            accept=".pdf,application/pdf"
            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-2xl file:border-0 file:bg-teal-50 file:px-4 file:py-2 file:font-semibold file:text-teal-700"
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={uploading}
            className="rounded-2xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {uploading ? "Indexation…" : "Importer le PDF"}
          </button>
        </form>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <h3 className="text-lg font-semibold text-slate-900">Documents ({documents.length})</h3>
          {documents.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun PDF importé.</p>
          ) : (
            documents.map((document) => (
              <button
                key={document.id}
                type="button"
                onClick={() => setSelectedId(document.id)}
                className={`w-full rounded-2xl border px-4 py-3 text-left ${
                  selectedId === document.id
                    ? "border-teal-400 bg-teal-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <p className="font-semibold text-slate-900">{document.name}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {document.page_count} pages · {document.chunk_count} chunks · {formatBytes(document.file_size_bytes)}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-900">Analyse AO + recommandations</h3>
          {selectedId ? (
            <button
              type="button"
              onClick={runAnalysis}
              disabled={analyzing}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
            >
              {analyzing ? "Analyse…" : "Analyser"}
            </button>
          ) : null}
        </div>

        {!analysis ? (
          <p className="text-sm text-slate-500">Sélectionnez un document pour voir l&apos;analyse.</p>
        ) : (
          <>
            <p className="text-sm text-slate-700 leading-6">{analysis.summary}</p>

            <div>
              <h4 className="font-semibold text-slate-900 mb-2">Exigences détectées</h4>
              <div className="space-y-2">
                {analysis.requirements.map((item) => (
                  <div key={item.id} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                    <p className="font-medium">{item.title} · {item.page}</p>
                    <p className="text-slate-600 mt-1">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-2">Gaps vs audit CRM</h4>
              <div className="space-y-2">
                {analysis.gaps.map((gap, index) => (
                  <div key={`${gap.requirement_id}-${index}`} className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm">
                    <p className="font-medium">{gap.message}</p>
                    <p className="text-slate-600 mt-1">{gap.evidence}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-2">Recommandations AO</h4>
              <div className="space-y-2">
                {analysis.recommendations.map((item, index) => (
                  <div key={`${item.title}-${index}`} className="rounded-2xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-slate-700 mt-1">{item.action}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
