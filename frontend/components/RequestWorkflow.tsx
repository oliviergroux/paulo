"use client";

import { useState } from "react";
import { subtypeLabel } from "@/lib/taxonomy";
import type { AssignOption, PartnerSummary, RequestItem } from "@/lib/types";

type WorkflowVariant = "admin" | "mairie";

type RequestWorkflowProps = {
  request: RequestItem;
  variant: WorkflowVariant;
  assignMode?: "partner" | "service";
  assignOptions: AssignOption[];
  selectedAssignId?: string;
  onSelectAssign: (id: string) => void;
  onAssign: () => Promise<void> | void;
  onTake: () => Promise<void> | void;
  onMarkDone: () => Promise<void> | void;
  onArchive: () => Promise<void> | void;
  assignLabel?: string;
  assignedLabel?: string;
  showAssign?: boolean;
  showArchive?: boolean;
  autoArchiveOnDone?: boolean;
  doneLabel?: string;
  compact?: boolean;
};

const STEPS = [
  { id: "new", label: "Nouveau" },
  { id: "in_progress", label: "En cours" },
  { id: "done", label: "Traité" },
] as const;

const VARIANT_STYLES = {
  admin: {
    accent: "bg-blue-600",
    accentHover: "hover:bg-blue-700",
    accentRing: "ring-blue-100",
    accentText: "text-blue-700",
    chip: "bg-blue-50 text-blue-800 border-blue-100",
    secondary:
      "border border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100",
    take: "bg-orange-500 hover:bg-orange-600 text-white",
  },
  mairie: {
    accent: "bg-violet-600",
    accentHover: "hover:bg-violet-700",
    accentRing: "ring-violet-100",
    accentText: "text-violet-700",
    chip: "bg-violet-50 text-violet-800 border-violet-100",
    secondary:
      "border border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100",
    take: "bg-violet-600 hover:bg-violet-700 text-white",
  },
};

function stepIndex(status: string): number {
  if (status === "in_progress") return 1;
  if (status === "done") return 2;
  return 0;
}

function isMairieRequest(request: RequestItem): boolean {
  return request.category?.trim().toLowerCase() === "mairie";
}

export default function RequestWorkflow({
  request,
  variant,
  assignMode = "partner",
  assignOptions,
  selectedAssignId,
  onSelectAssign,
  onAssign,
  onTake,
  onMarkDone,
  onArchive,
  assignLabel = "Assigner à un partenaire",
  assignedLabel = "Assigné à",
  showAssign = true,
  showArchive = true,
  autoArchiveOnDone = false,
  doneLabel = "Marquer comme traité",
  compact = false,
}: RequestWorkflowProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const styles = VARIANT_STYLES[variant];
  const currentStep = stepIndex(request.status);
  const serviceMode = assignMode === "service" || isMairieRequest(request);
  const isAssigned = serviceMode
    ? Boolean(request.assigned_service)
    : Boolean(request.assigned_partner_id);

  const run = async (key: string, action: () => Promise<void> | void) => {
    setBusy(key);
    try {
      await action();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={compact ? "space-y-3" : "space-y-5"}>
      {!compact && (
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Progression
        </p>
        <div className="flex items-center gap-1">
          {STEPS.map((step, index) => {
            const isDone = index < currentStep;
            const isActive = index === currentStep;

            return (
              <div key={step.id} className="flex items-center flex-1 min-w-0">
                <div className="flex flex-col items-center flex-1 min-w-0">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isDone
                        ? "bg-emerald-500 text-white"
                        : isActive
                        ? `${styles.accent} text-white ring-4 ${styles.accentRing}`
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {isDone ? "✓" : index + 1}
                  </div>
                  <span
                    className={`text-[10px] font-semibold mt-1.5 truncate w-full text-center ${
                      isActive ? "text-slate-900" : "text-slate-400"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-1 mb-5 rounded ${
                      index < currentStep ? "bg-emerald-400" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
      )}

      {serviceMode && request.assigned_service && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-medium ${styles.chip}`}
        >
          <span className="text-slate-500 font-normal">{assignedLabel} </span>
          {subtypeLabel(request.assigned_service)}
        </div>
      )}

      {!serviceMode && request.assigned_partner_id && request.partner_name && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-medium ${styles.chip}`}
        >
          <span className="text-slate-500 font-normal">{assignedLabel} </span>
          {request.partner_name}
        </div>
      )}

      <div className="space-y-2">
        {request.status === "done" ? (
          showArchive && !autoArchiveOnDone ? (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => run("archive", onArchive)}
              className="w-full rounded-2xl border border-slate-200 bg-white text-slate-800 px-4 py-3 text-sm font-semibold hover:bg-slate-50 transition disabled:opacity-60"
            >
              {busy === "archive" ? "Archivage..." : "Archiver la demande"}
            </button>
          ) : (
            <p className="text-sm font-semibold text-emerald-700">Demande traitée</p>
          )
        ) : request.status === "in_progress" ? (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() =>
              run("done", async () => {
                await onMarkDone();
                if (autoArchiveOnDone) {
                  await onArchive();
                }
              })
            }
            className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:opacity-60 ${
              autoArchiveOnDone
                ? `${styles.accent} ${styles.accentHover} text-white`
                : "bg-slate-950 hover:bg-slate-800 text-white"
            }`}
          >
            {busy === "done"
              ? "Clôture..."
              : autoArchiveOnDone
              ? doneLabel
              : "Marquer comme traité"}
          </button>
        ) : (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => run("take", onTake)}
            className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:opacity-60 ${styles.take}`}
          >
            {busy === "take" ? "Prise en charge..." : "Prendre en charge"}
          </button>
        )}
      </div>

      {!showAssign || isAssigned || request.status === "done" ? null : (
        <div className="pt-4 border-t border-slate-200 space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            {assignLabel}
          </p>

          <select
            value={selectedAssignId || ""}
            onChange={(e) => onSelectAssign(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
            <option value="">Sélectionner...</option>
            {assignOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>

          {assignOptions.length === 0 && (
            <p className="text-xs text-slate-500 leading-5">
              Aucune option disponible pour le moment.
            </p>
          )}

          <button
            type="button"
            disabled={!selectedAssignId || busy !== null}
            onClick={() => run("assign", onAssign)}
            className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-60 ${
              !selectedAssignId
                ? "bg-slate-300 cursor-not-allowed"
                : `${styles.accent} ${styles.accentHover}`
            }`}
          >
            {busy === "assign" ? "Assignation..." : "Confirmer l'assignation"}
          </button>
        </div>
      )}
    </div>
  );
}

export function matchingPartners(
  request: RequestItem,
  partners: PartnerSummary[]
): AssignOption[] {
  const requestCategory = request.category?.trim().toLowerCase();
  const requestSubtype = request.subtype?.trim().toLowerCase();

  if (requestCategory === "mairie") {
    return [];
  }

  return partners
    .filter((partner) => {
      const partnerCategory = partner.category?.trim().toLowerCase();
      const partnerSubtype = partner.subtype?.trim().toLowerCase();

      return (
        partner.is_active &&
        partnerCategory === requestCategory &&
        (!requestSubtype ||
          requestSubtype === "autre" ||
          partnerSubtype === requestSubtype)
      );
    })
    .map((partner) => ({
      id: String(partner.id),
      label: partner.name,
    }));
}

export function partnerAssignOptions(partners: PartnerSummary[]): AssignOption[] {
  return partners.map((partner) => ({
    id: String(partner.id),
    label: partner.name,
  }));
}
