"use client";

import EmptyState from "./EmptyState";
import MairieRequestCard from "./MairieRequestCard";
import type { AssignOption, RequestItem } from "@/lib/types";

type MairieKanbanBoardProps = {
  newRequests: RequestItem[];
  inProgressRequests: RequestItem[];
  highlightedIds: number[];
  assignOptions: AssignOption[];
  selectedServices: Record<number, string>;
  onSelectService: (requestId: number, serviceId: string) => void;
  onAssign: (requestId: number) => void;
  onTake: (requestId: number) => void;
  onMarkDone: (requestId: number) => void;
  onArchive: (requestId: number) => void;
  resolveDefaultService: (request: RequestItem) => string;
};

type KanbanColumnProps = {
  title: string;
  subtitle: string;
  count: number;
  accent: "amber" | "violet";
  emptyMessage: string;
  requests: RequestItem[];
  highlightedIds: number[];
  assignOptions: AssignOption[];
  selectedServices: Record<number, string>;
  onSelectService: (requestId: number, serviceId: string) => void;
  onAssign: (requestId: number) => void;
  onTake: (requestId: number) => void;
  onMarkDone: (requestId: number) => void;
  onArchive: (requestId: number) => void;
  resolveDefaultService: (request: RequestItem) => string;
};

const COLUMN_STYLES = {
  amber: {
    header: "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200/80",
    badge: "bg-amber-500 text-white",
    dot: "bg-amber-400",
  },
  violet: {
    header: "bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200/80",
    badge: "bg-violet-600 text-white",
    dot: "bg-violet-500",
  },
};

function KanbanColumn({
  title,
  subtitle,
  count,
  accent,
  emptyMessage,
  requests,
  highlightedIds,
  assignOptions,
  selectedServices,
  onSelectService,
  onAssign,
  onTake,
  onMarkDone,
  onArchive,
  resolveDefaultService,
}: KanbanColumnProps) {
  const styles = COLUMN_STYLES[accent];

  return (
    <div className="flex flex-col min-h-[420px] rounded-3xl border border-slate-200/80 bg-white/60 backdrop-blur-sm shadow-sm overflow-hidden">
      <div className={`px-5 py-4 border-b ${styles.header}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className={`h-2.5 w-2.5 rounded-full ${styles.dot}`} />
            <div>
              <h3 className="text-sm font-bold text-slate-900">{title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
            </div>
          </div>
          <span
            className={`inline-flex h-8 min-w-8 items-center justify-center rounded-xl px-2.5 text-sm font-bold ${styles.badge}`}
          >
            {count}
          </span>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[calc(100vh-320px)]">
        {requests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center">
            <p className="text-sm text-slate-500">{emptyMessage}</p>
          </div>
        ) : (
          requests.map((request) => (
            <MairieRequestCard
              key={request.id}
              request={request}
              highlighted={highlightedIds.includes(request.id)}
              assignOptions={assignOptions}
              selectedAssignId={
                selectedServices[request.id] || resolveDefaultService(request)
              }
              onSelectAssign={(serviceId) =>
                onSelectService(request.id, serviceId)
              }
              onAssign={() => onAssign(request.id)}
              onTake={() => onTake(request.id)}
              onMarkDone={() => onMarkDone(request.id)}
              onArchive={() => onArchive(request.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function MairieKanbanBoard({
  newRequests,
  inProgressRequests,
  highlightedIds,
  assignOptions,
  selectedServices,
  onSelectService,
  onAssign,
  onTake,
  onMarkDone,
  onArchive,
  resolveDefaultService,
}: MairieKanbanBoardProps) {
  const total = newRequests.length + inProgressRequests.length;

  if (total === 0) {
    return (
      <EmptyState message="Aucune demande active. Les dossiers clôturés sont disponibles dans Archives." />
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      <KanbanColumn
        title="Nouvelles demandes"
        subtitle="À qualifier et assigner"
        count={newRequests.length}
        accent="amber"
        emptyMessage="Aucune nouvelle demande — tout est pris en charge."
        requests={newRequests}
        highlightedIds={highlightedIds}
        assignOptions={assignOptions}
        selectedServices={selectedServices}
        onSelectService={onSelectService}
        onAssign={onAssign}
        onTake={onTake}
        onMarkDone={onMarkDone}
        onArchive={onArchive}
        resolveDefaultService={resolveDefaultService}
      />
      <KanbanColumn
        title="En cours de traitement"
        subtitle="Prises en charge par les services"
        count={inProgressRequests.length}
        accent="violet"
        emptyMessage="Aucun dossier en cours pour le moment."
        requests={inProgressRequests}
        highlightedIds={highlightedIds}
        assignOptions={assignOptions}
        selectedServices={selectedServices}
        onSelectService={onSelectService}
        onAssign={onAssign}
        onTake={onTake}
        onMarkDone={onMarkDone}
        onArchive={onArchive}
        resolveDefaultService={resolveDefaultService}
      />
    </div>
  );
}
