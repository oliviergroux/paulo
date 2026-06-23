"use client";

import type { AdminCategoryStat } from "@/lib/admin-stats";

type AdminCategoryChartProps = {
  stats: AdminCategoryStat[];
  activeTotal: number;
};

export default function AdminCategoryChart({
  stats,
  activeTotal,
}: AdminCategoryChartProps) {
  const maxCount = stats.reduce(
    (max, row) => Math.max(max, row.activeCount),
    0
  );

  if (activeTotal === 0 || stats.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">
          Répartition par catégorie
        </p>
        <p className="text-sm text-slate-500 mt-1">
          Demandes nouvelles et en cours de traitement
        </p>
        <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
          <p className="text-sm font-medium text-slate-700">
            Aucune demande active pour le moment
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
            Répartition par catégorie
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {activeTotal} demande{activeTotal > 1 ? "s" : ""} active
            {activeTotal > 1 ? "s" : ""} — nouvelles et en cours
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium">
          <span className="inline-flex items-center gap-2 text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            Nouveau
          </span>
          <span className="inline-flex items-center gap-2 text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
            En cours
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {stats.map((row) => {
          const scale = maxCount > 0 ? (row.activeCount / maxCount) * 100 : 0;
          const newWidth =
            row.activeCount > 0 ? (row.newCount / row.activeCount) * 100 : 0;

          return (
            <div
              key={row.category}
              className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3"
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-sm font-semibold text-slate-800 truncate">
                  {row.label}
                </span>
                <span className="text-sm font-bold text-slate-900 shrink-0">
                  {row.activeCount}
                  <span className="text-xs font-normal text-slate-500 ml-1.5">
                    ({row.newCount} nouveau{row.newCount > 1 ? "x" : ""},{" "}
                    {row.inProgressCount} en cours)
                  </span>
                </span>
              </div>

              <div className="h-3 rounded-full bg-slate-200/80 overflow-hidden">
                <div
                  className="h-full flex"
                  style={{ width: `${Math.max(scale, 8)}%` }}
                >
                  {row.newCount > 0 && (
                    <span
                      className="h-full bg-amber-400"
                      style={{ width: `${newWidth}%` }}
                    />
                  )}
                  {row.inProgressCount > 0 && (
                    <span
                      className="h-full bg-blue-600"
                      style={{ width: `${100 - newWidth}%` }}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
