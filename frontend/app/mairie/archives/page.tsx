"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AuthenticatedShell from "@/components/AuthenticatedShell";
import DayDivider from "@/components/DayDivider";
import EmptyState from "@/components/EmptyState";
import StatusBadge from "@/components/StatusBadge";
import { mairieFetch } from "@/lib/api";
import {
  displayClientName,
  formatDate,
  formatDayLabel,
  isMairieRequest,
} from "@/lib/format";
import { resolveMairieTopic } from "@/lib/mairie-stats";
import { MAIRIE_SERVICES, subtypeLabel } from "@/lib/taxonomy";
import type { RequestItem } from "@/lib/types";

export default function MairieArchivesPage() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [serviceFilter, setServiceFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const mairieArchived = requests
    .filter(isMairieRequest)
    .filter((req) =>
      serviceFilter === "all" ? true : resolveMairieTopic(req) === serviceFilter
    );

  const grouped = mairieArchived.reduce(
    (acc: Record<string, RequestItem[]>, req) => {
      const label = formatDayLabel(req.handled_at || req.created_at);
      if (!acc[label]) acc[label] = [];
      acc[label].push(req);
      return acc;
    },
    {}
  );

  useEffect(() => {
    mairieFetch("/requests?archived=true")
      .then((res) => res.json())
      .then((data: RequestItem[]) => setRequests(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthenticatedShell
      activeNav="mairie_archives"
      maxWidth="full"
      sidebarNote={{
        title: "Historique",
        description: "Demandes clôturées et archivées automatiquement.",
      }}
    >
      <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-violet-600 uppercase tracking-wide">
            Archives
          </p>
          <h1 className="text-3xl font-bold text-slate-900 mt-1">
            Demandes archivées
          </h1>
          <p className="text-slate-500 mt-2 text-sm max-w-xl">
            Retrouvez l'historique des signalements traités. Les dossiers sont
            archivés automatiquement à la clôture.
          </p>
        </div>

        <Link
          href="/mairie"
          className="inline-flex items-center justify-center rounded-2xl bg-violet-600 text-white px-5 py-3 text-sm font-semibold hover:bg-violet-700 transition shadow-sm"
        >
          ← Retour aux demandes actives
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <select
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm"
        >
          <option value="all">Tous les services</option>
          {MAIRIE_SERVICES.map((service) => (
            <option key={service} value={service}>
              {subtypeLabel(service)}
            </option>
          ))}
        </select>
        <span className="text-sm text-slate-500">
          {mairieArchived.length} dossier{mairieArchived.length > 1 ? "s" : ""}
        </span>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Chargement...</p>
      ) : mairieArchived.length === 0 ? (
        <EmptyState message="Aucune demande archivée pour le moment." />
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([dayLabel, dayRequests]) => (
            <div key={dayLabel}>
              <DayDivider label={dayLabel} />
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {dayRequests.map((req) => {
                  const topic = resolveMairieTopic(req);
                  return (
                    <article
                      key={req.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition"
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {subtypeLabel(topic)}
                        </span>
                        <StatusBadge status="done" size="sm" />
                      </div>

                      <p className="text-sm leading-6 text-slate-800 line-clamp-4">
                        {req.transcription}
                      </p>

                      <div className="mt-4 pt-4 border-t border-slate-100 space-y-1.5 text-xs text-slate-500">
                        <p>
                          <span className="font-medium text-slate-700">
                            {displayClientName(req.first_name, req.last_name)}
                          </span>{" "}
                          · {req.phone}
                        </p>
                        <p>Reçue le {formatDate(req.created_at)}</p>
                        {req.handled_at && (
                          <p>Clôturée le {formatDate(req.handled_at)}</p>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </AuthenticatedShell>
  );
}
