"use client";

import type { MairieTopicStat } from "@/lib/mairie-stats";

type MairieTopicChartProps = {
  stats: MairieTopicStat[];
  activeTotal: number;
  selectedSubtype?: string;
  onSelectSubtype: (subtype: string) => void;
};

export default function MairieTopicChart({
  stats,
  activeTotal,
  selectedSubtype,
  onSelectSubtype,
}: MairieTopicChartProps) {
  const activeRows = stats.filter((row) => row.activeCount > 0);
  const maxCount = activeRows.reduce(
    (max, row) => Math.max(max, row.activeCount),
    0
  );
  const mostlyUnclassified =
    activeTotal > 0 &&
    activeRows.length === 1 &&
    activeRows[0]?.subtype === "autre";

  if (activeTotal === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">
          Répartition par service municipal
        </p>
        <p className="text-sm text-slate-500 mt-1">
          Voirie, propreté, eau / assainissement, administratif…
        </p>
        <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
          <p className="text-sm font-medium text-slate-700">
            Aucun dossier en cours pour le moment
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Les signalements apparaîtront ici dès qu&apos;ils seront ouverts ou
            pris en charge.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Répartition par service municipal
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {activeTotal} dossier{activeTotal > 1 ? "s" : ""} actif
            {activeTotal > 1 ? "s" : ""} — nouveaux et en cours de traitement
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium">
          <span className="inline-flex items-center gap-2 text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            Nouveau
          </span>
          <span className="inline-flex items-center gap-2 text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full bg-violet-600" />
            En cours
          </span>
        </div>
      </div>

      {mostlyUnclassified && (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Les demandes ne sont pas encore classées par sujet précis. Assignez-les
          à un service municipal pour affiner cette vue.
        </div>
      )}

      <div className="space-y-2">
        {stats.map((row) => {
          const scale =
            row.activeCount > 0 && maxCount > 0
              ? (row.activeCount / maxCount) * 100
              : 0;
          const newWidth =
            row.activeCount > 0 ? (row.newCount / row.activeCount) * 100 : 0;
          const isSelected = selectedSubtype === row.subtype;
          const isEmpty = row.activeCount === 0;

          return (
            <button
              key={row.subtype}
              type="button"
              disabled={isEmpty}
              onClick={() => onSelectSubtype(row.subtype)}
              className={`w-full text-left rounded-2xl border px-4 py-3 transition ${
                isEmpty
                  ? "border-slate-100 bg-white opacity-50 cursor-default"
                  : isSelected
                  ? "border-violet-400 bg-violet-50 ring-2 ring-violet-100"
                  : "border-slate-100 bg-slate-50/70 hover:border-violet-200 hover:bg-violet-50/40"
              }`}
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-sm font-semibold text-slate-800 truncate">
                  {row.label}
                </span>
                <span className="text-sm font-bold text-slate-900 shrink-0">
                  {row.activeCount}
                  {!isEmpty && (
                    <span className="text-xs font-normal text-slate-500 ml-1.5">
                      ({row.newCount} nouveau{row.newCount > 1 ? "x" : ""},{" "}
                      {row.inProgressCount} en cours)
                    </span>
                  )}
                </span>
              </div>

              <div className="h-3 rounded-full bg-slate-200/80 overflow-hidden">
                {!isEmpty && (
                  <div
                    className="h-full flex"
                    style={{
                      width: `${Math.max(scale, 8)}%`,
                    }}
                  >
                    {row.newCount > 0 && (
                      <span
                        className="h-full bg-amber-400"
                        style={{ width: `${newWidth}%` }}
                        title={`${row.newCount} nouveau(x)`}
                      />
                    )}
                    {row.inProgressCount > 0 && (
                      <span
                        className="h-full bg-violet-600"
                        style={{ width: `${100 - newWidth}%` }}
                        title={`${row.inProgressCount} en cours`}
                      />
                    )}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-slate-400 mt-4">
        Cliquez sur un service pour filtrer la liste des demandes ci-dessous.
      </p>
    </div>
  );
}
