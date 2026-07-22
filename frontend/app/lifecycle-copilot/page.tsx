"use client";

import { useEffect, useState } from "react";
import LifecycleCopilotShell from "@/components/lifecycle-copilot/shell/LifecycleCopilotShell";
import { lcFetch } from "@/lib/lifecycle-copilot/api";
import type { LcMeta } from "@/lib/lifecycle-copilot/types/project";

export default function LifecycleCopilotHomePage() {
  const [meta, setMeta] = useState<LcMeta | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    lcFetch("/v1/meta")
      .then((res) => res.json())
      .then((data) => setMeta(data))
      .finally(() => setLoading(false));
  }, []);

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
          Préparez vos audits lifecycle : dictionnaire de données, imports CSV/XLSX,
          profilage et futures recommandations IA.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Projets
          </p>
          <p className="text-3xl font-bold mt-2 text-slate-900">0</p>
          <p className="text-sm text-slate-500 mt-2">CRUD disponible en PR1</p>
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
              : "À configurer"}
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-10 text-center">
        <p className="text-lg font-semibold text-slate-900">Aucun projet pour l&apos;instant</p>
        <p className="text-sm text-slate-500 mt-2 max-w-xl mx-auto leading-6">
          Le squelette est en place. Prochaine étape : création de projet, puis import
          dictionnaire et fichiers lourds via object storage.
        </p>
      </div>
    </LifecycleCopilotShell>
  );
}
