"use client";

import { useState } from "react";
import ClientInfoBlock from "./ClientInfoBlock";
import RequestWorkflow from "./RequestWorkflow";
import StatusBadge from "./StatusBadge";
import {
  displayClientName,
  formatRelativeTime,
} from "@/lib/format";
import { resolveMairieTopic } from "@/lib/mairie-stats";
import { subtypeLabel } from "@/lib/taxonomy";
import type { AssignOption, RequestItem } from "@/lib/types";

type MairieRequestCardProps = {
  request: RequestItem;
  highlighted?: boolean;
  assignOptions: AssignOption[];
  selectedAssignId?: string;
  onSelectAssign: (id: string) => void;
  onAssign: () => Promise<void> | void;
  onTake: () => Promise<void> | void;
  onMarkDone: () => Promise<void> | void;
  onArchive: () => Promise<void> | void;
};

export default function MairieRequestCard({
  request,
  highlighted = false,
  assignOptions,
  selectedAssignId,
  onSelectAssign,
  onAssign,
  onTake,
  onMarkDone,
  onArchive,
}: MairieRequestCardProps) {
  const [expanded, setExpanded] = useState(false);
  const topic = resolveMairieTopic(request);
  const topicLabel = subtypeLabel(topic);
  const clientName = displayClientName(request.first_name, request.last_name);

  return (
    <article
      className={`group rounded-2xl border bg-white shadow-sm transition-all duration-300 overflow-hidden ${
        highlighted
          ? "border-amber-300 ring-2 ring-amber-100 shadow-md"
          : "border-slate-200/80 hover:border-violet-200 hover:shadow-md"
      }`}
    >
      <div
        className={`h-1 ${
          request.status === "new"
            ? "bg-gradient-to-r from-amber-400 to-amber-300"
            : "bg-gradient-to-r from-violet-600 to-violet-400"
        }`}
      />

      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <span className="inline-flex items-center rounded-full bg-violet-50 border border-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-800">
              {topicLabel}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-medium text-slate-400">
              {formatRelativeTime(request.created_at)}
            </span>
            <StatusBadge status={request.status} size="sm" />
          </div>
        </div>

        <p
          className={`text-sm leading-6 text-slate-800 ${
            expanded ? "" : "line-clamp-3"
          }`}
        >
          {request.transcription}
        </p>

        {request.transcription.length > 120 && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="mt-1 text-xs font-semibold text-violet-600 hover:text-violet-800"
          >
            {expanded ? "Réduire" : "Voir plus"}
          </button>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="font-medium text-slate-700">{clientName}</span>
          <span className="text-slate-300">·</span>
          <span>{request.phone}</span>
          {request.assigned_service && (
            <>
              <span className="text-slate-300">·</span>
              <span className="text-violet-600 font-medium">
                → {subtypeLabel(request.assigned_service)}
              </span>
            </>
          )}
        </div>

        {(request.first_name || request.address) && expanded && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <ClientInfoBlock
              firstName={request.first_name}
              lastName={request.last_name}
              address={request.address}
            />
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 bg-slate-50/80 p-4">
        <RequestWorkflow
          request={request}
          variant="mairie"
          assignMode="service"
          assignOptions={assignOptions}
          selectedAssignId={selectedAssignId}
          onSelectAssign={onSelectAssign}
          onAssign={onAssign}
          onTake={onTake}
          onMarkDone={onMarkDone}
          onArchive={onArchive}
          assignLabel="Assigner au service"
          assignedLabel="Service :"
          showArchive={false}
          autoArchiveOnDone
          doneLabel="Clôturer et archiver"
          compact
        />
      </div>
    </article>
  );
}
