import StatusBadge from "./StatusBadge";
import type { RequestItem } from "@/lib/types";

type RequestActionsPartnerProps = {
  request: RequestItem;
  onTake: () => void;
  onMarkDone: () => void;
};

export default function RequestActionsPartner({
  request,
  onTake,
  onMarkDone,
}: RequestActionsPartnerProps) {
  return (
    <>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
        Traitement
      </p>

      {request.status === "done" ? (
        <StatusBadge status="done" />
      ) : request.status === "in_progress" ? (
        <div className="space-y-3">
          <StatusBadge status="in_progress" />
          <button
            onClick={onMarkDone}
            className="w-full bg-slate-950 hover:bg-slate-800 text-white px-4 py-3 rounded-2xl text-sm font-semibold transition"
          >
            Marquer traité
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <StatusBadge status="new" />
          <button
            onClick={onTake}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white px-4 py-3 rounded-2xl text-sm font-semibold transition"
          >
            Prendre
          </button>
        </div>
      )}
    </>
  );
}
