"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import ProjectCreateForm from "@/components/lifecycle-copilot/projects/ProjectCreateForm";
import LifecycleCopilotShell from "@/components/lifecycle-copilot/shell/LifecycleCopilotShell";
import { lcFetch } from "@/lib/lifecycle-copilot/api";
import type { LcMeta, LcProjectSummary } from "@/lib/lifecycle-copilot/types/project";

export default function LifecycleCopilotHomePage() {
  const [meta, setMeta] = useState<LcMeta | null>(null);
  const [projects, setProjects] = useState<LcProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [metaResponse, projectsResponse] = await Promise.all([
        lcFetch("/v1/meta"),
        lcFetch("/v1/projects"),
      ]);
      setMeta(await metaResponse.json());
      setProjects(await projectsResponse.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <LifecycleCopilotShell activeNav="projects">
      <div className="mb-8 rounded-[32px] bg-gradient-to-br from-teal-700 via-teal-600 to-cyan-700 text-white p-8 shadow-lg shadow-teal-200/40">
        <p className="text-teal-100 text-sm font-medium uppercase tracking-wide">
          Lifecycle Copilot
        </p>
        <h1 className="text-3xl md:text-4xl font-bold mt-2 tracking-tight">
          Projets CRM
        </h1>
        <p className="text-teal-50/90 mt-3 max-w-2xl text-sm md:text-base leading-6">
          Dictionnaire de données, imports CSV/XLSX, profilage colonnes et base pour
          les futures recommandations IA.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Projets
          </p>
          <p className="text-3xl font-bold mt-2 text-slate-900">
            {loading ? "…" : projects.length}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Formats import
          </p>
          <p className="text-lg font-bold mt-2 text-slate-900">CSV · XLSX</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Object storage
          </p>
          <p className="text-lg font-bold mt-2 text-slate-900">
            {loading
              ? "…"
              : meta?.object_storage_configured
              ? "Configuré"
              : "Copie locale DB"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Vos projets</h2>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-500">
              Chargement…
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-10 text-center">
              <p className="text-lg font-semibold text-slate-900">Aucun projet</p>
              <p className="text-sm text-slate-500 mt-2">
                Créez un premier projet pour importer dictionnaire et datasets.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/lifecycle-copilot/projects/${project.id}`}
                  className="block rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:border-teal-300 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">{project.name}</p>
                      <p className="text-sm text-slate-500 mt-1">
                        {[project.client_name, project.crm_platform].filter(Boolean).join(" · ") ||
                          "Projet sans client renseigné"}
                      </p>
                    </div>
                    <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                      {project.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <ProjectCreateForm onCreated={loadData} />
      </div>
    </LifecycleCopilotShell>
  );
}
