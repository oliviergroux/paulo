"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import DatasetImportPanel from "@/components/lifecycle-copilot/datasets/DatasetImportPanel";
import DictionaryImportPanel from "@/components/lifecycle-copilot/dictionary/DictionaryImportPanel";
import McdViewer from "@/components/lifecycle-copilot/mcd/McdViewer";
import LifecycleCopilotShell from "@/components/lifecycle-copilot/shell/LifecycleCopilotShell";
import { lcFetch } from "@/lib/lifecycle-copilot/api";
import type {
  LcColumnProfile,
  LcDatasetDetail,
  LcDatasetSummary,
  LcDictionaryEntry,
  LcDictionaryTableSummary,
  LcProjectDetail,
} from "@/lib/lifecycle-copilot/types/project";

type TabId = "overview" | "dictionary" | "datasets" | "mcd";

function formatBytes(value: number) {
  if (value < 1024) return `${value} o`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} Ko`;
  return `${(value / (1024 * 1024)).toFixed(1)} Mo`;
}

export default function LifecycleCopilotProjectPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = Number(params.projectId);
  const [tab, setTab] = useState<TabId>("overview");
  const [project, setProject] = useState<LcProjectDetail | null>(null);
  const [tables, setTables] = useState<LcDictionaryTableSummary[]>([]);
  const [entries, setEntries] = useState<LcDictionaryEntry[]>([]);
  const [datasets, setDatasets] = useState<LcDatasetSummary[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);
  const [profiles, setProfiles] = useState<LcColumnProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [mcdRefreshKey, setMcdRefreshKey] = useState(0);

  const selectedDataset = useMemo(
    () => datasets.find((dataset) => dataset.id === selectedDatasetId) || null,
    [datasets, selectedDatasetId]
  );

  const loadProject = useCallback(async () => {
    setLoading(true);
    try {
      const [projectResponse, tablesResponse, entriesResponse, datasetsResponse] =
        await Promise.all([
          lcFetch(`/v1/projects/${projectId}`),
          lcFetch(`/v1/projects/${projectId}/dictionary/tables`),
          lcFetch(`/v1/projects/${projectId}/dictionary`),
          lcFetch(`/v1/projects/${projectId}/datasets`),
        ]);

      setProject(await projectResponse.json());
      setTables(await tablesResponse.json());
      setEntries(await entriesResponse.json());
      const datasetList = (await datasetsResponse.json()) as LcDatasetSummary[];
      setDatasets(datasetList);
      setSelectedDatasetId((current) => current ?? datasetList[0]?.id ?? null);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const loadProfiles = useCallback(
    async (datasetId: number) => {
      const response = await lcFetch(
        `/v1/projects/${projectId}/datasets/${datasetId}/profiles`
      );
      setProfiles(await response.json());
    },
    [projectId]
  );

  useEffect(() => {
    if (Number.isFinite(projectId)) {
      loadProject();
    }
  }, [loadProject, projectId]);

  useEffect(() => {
    if (selectedDatasetId) {
      loadProfiles(selectedDatasetId);
    }
  }, [loadProfiles, selectedDatasetId]);

  async function handleDatasetImported(dataset: LcDatasetDetail) {
    await loadProject();
    setSelectedDatasetId(dataset.id);
    setProfiles(dataset.profiles || []);
    setTab("datasets");
  }

  async function recomputeProfiles() {
    if (!selectedDatasetId) return;
    const response = await lcFetch(
      `/v1/projects/${projectId}/datasets/${selectedDatasetId}/profiles`,
      { method: "POST" }
    );
    setProfiles(await response.json());
  }

  if (!Number.isFinite(projectId)) {
    return null;
  }

  return (
    <LifecycleCopilotShell activeNav="projects">
      <div className="mb-6">
        <Link href="/lifecycle-copilot" className="text-sm text-teal-700 hover:underline">
          ← Retour aux projets
        </Link>
      </div>

      {loading || !project ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-500">
          Chargement du projet…
        </div>
      ) : (
        <>
          <div className="mb-8 rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-wide text-teal-700">
                  Projet #{project.id}
                </p>
                <h1 className="text-3xl font-bold text-slate-900 mt-1">{project.name}</h1>
                <p className="text-slate-500 mt-2">
                  {[project.client_name, project.crm_platform].filter(Boolean).join(" · ") ||
                    "Client / CRM non renseignés"}
                </p>
                {project.description ? (
                  <p className="text-sm text-slate-600 mt-4 max-w-3xl leading-6">
                    {project.description}
                  </p>
                ) : null}
              </div>
              <span className="rounded-full bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700">
                {project.status}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {(
              [
                ["overview", "Vue d'ensemble"],
                ["dictionary", "Dictionnaire"],
                ["mcd", "MCD"],
                ["datasets", "Datasets"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                  tab === id
                    ? "bg-slate-900 text-white"
                    : "bg-white border border-slate-200 text-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "overview" ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Tables dictionnaire</p>
                <p className="text-3xl font-bold mt-2">{tables.length}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Colonnes dictionnaire</p>
                <p className="text-3xl font-bold mt-2">{entries.length}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Datasets importés</p>
                <p className="text-3xl font-bold mt-2">{datasets.length}</p>
              </div>
            </div>
          ) : null}

          {tab === "dictionary" ? (
            <div className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-6">
              <DictionaryImportPanel
                projectId={projectId}
                onImported={() => {
                  setMcdRefreshKey((value) => value + 1);
                  loadProject();
                }}
              />
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm overflow-hidden">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Dictionnaire ({entries.length} colonnes)
                </h3>
                {entries.length === 0 ? (
                  <p className="text-sm text-slate-500">Aucune entrée importée.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-slate-500 border-b border-slate-100">
                          <th className="py-2 pr-4">Table</th>
                          <th className="py-2 pr-4">Colonne</th>
                          <th className="py-2 pr-4">Type</th>
                          <th className="py-2">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.slice(0, 100).map((entry) => (
                          <tr key={entry.id} className="border-b border-slate-50">
                            <td className="py-2 pr-4 font-medium">{entry.table_name}</td>
                            <td className="py-2 pr-4">{entry.column_name}</td>
                            <td className="py-2 pr-4">{entry.data_type || "—"}</td>
                            <td className="py-2 text-slate-600">{entry.description || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {entries.length > 100 ? (
                      <p className="text-xs text-slate-400 mt-3">
                        Affichage limité aux 100 premières lignes.
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {tab === "mcd" ? (
            <McdViewer projectId={projectId} refreshKey={mcdRefreshKey} />
          ) : null}

          {tab === "datasets" ? (
            <div className="space-y-6">
              <DatasetImportPanel
                projectId={projectId}
                onImported={handleDatasetImported}
              />

              <div className="grid grid-cols-1 xl:grid-cols-[0.8fr_1.2fr] gap-6">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
                  <h3 className="text-lg font-semibold text-slate-900">Datasets</h3>
                  {datasets.length === 0 ? (
                    <p className="text-sm text-slate-500">Aucun dataset importé.</p>
                  ) : (
                    datasets.map((dataset) => (
                      <button
                        key={dataset.id}
                        type="button"
                        onClick={() => setSelectedDatasetId(dataset.id)}
                        className={`w-full rounded-2xl border px-4 py-3 text-left ${
                          selectedDatasetId === dataset.id
                            ? "border-teal-400 bg-teal-50"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <p className="font-semibold text-slate-900">{dataset.name}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {dataset.row_count} lignes · {dataset.column_count} colonnes ·{" "}
                          {formatBytes(dataset.file_size_bytes)}
                        </p>
                      </button>
                    ))
                  )}
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Profilage colonnes</h3>
                      <p className="text-sm text-slate-500">
                        {selectedDataset
                          ? `${selectedDataset.name} · ${profiles.length} profils`
                          : "Sélectionnez un dataset"}
                      </p>
                    </div>
                    {selectedDataset ? (
                      <button
                        type="button"
                        onClick={recomputeProfiles}
                        className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                      >
                        Recalculer
                      </button>
                    ) : null}
                  </div>

                  {profiles.length === 0 ? (
                    <p className="text-sm text-slate-500">Aucun profil disponible.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left text-slate-500 border-b border-slate-100">
                            <th className="py-2 pr-4">Colonne</th>
                            <th className="py-2 pr-4">Nulls</th>
                            <th className="py-2 pr-4">Distinct</th>
                            <th className="py-2">Exemples</th>
                          </tr>
                        </thead>
                        <tbody>
                          {profiles.map((profile) => (
                            <tr key={profile.id} className="border-b border-slate-50 align-top">
                              <td className="py-2 pr-4 font-medium">{profile.column_name}</td>
                              <td className="py-2 pr-4">
                                {profile.null_count}/{profile.total_rows}
                              </td>
                              <td className="py-2 pr-4">{profile.distinct_count}</td>
                              <td className="py-2 text-slate-600">
                                {(profile.sample_values || []).join(", ") || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
    </LifecycleCopilotShell>
  );
}
