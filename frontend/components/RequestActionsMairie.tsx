import Link from "next/link";
import StatusBadge from "./StatusBadge";
import type { PartnerSummary, RequestItem } from "@/lib/types";

type RequestActionsMairieProps = {
  request: RequestItem;
  services: PartnerSummary[];
  selectedServiceId?: string;
  onSelectService: (serviceId: string) => void;
  onAssign: () => void;
  onTake: () => void;
  onMarkDone: () => void;
  onArchive: () => void;
};

export default function RequestActionsMairie({
  request,
  services,
  selectedServiceId,
  onSelectService,
  onAssign,
  onTake,
  onMarkDone,
  onArchive,
}: RequestActionsMairieProps) {
  if (request.assigned_partner_id) {
    return (
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Service assigné
          </p>
          <Link
            href={`/partners/${request.assigned_partner_id}`}
            className="text-sm font-semibold text-violet-700 underline underline-offset-2"
          >
            {request.partner_name}
          </Link>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {request.status === "done" ? (
            <>
              <StatusBadge status="done" />
              <button
                onClick={onArchive}
                className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 px-4 py-2 rounded-2xl text-sm font-medium transition"
              >
                Archiver
              </button>
            </>
          ) : request.status === "in_progress" ? (
            <>
              <StatusBadge status="in_progress" />
              <button
                onClick={onMarkDone}
                className="bg-slate-950 hover:bg-slate-800 text-white px-4 py-2 rounded-2xl text-sm font-medium transition"
              >
                Marquer traité
              </button>
            </>
          ) : (
            <>
              <StatusBadge status="new" />
              <button
                onClick={onTake}
                className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-2xl text-sm font-medium transition"
              >
                Prendre en charge
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
        Assigner à un service
      </p>

      <div className="space-y-3">
        <select
          value={selectedServiceId || ""}
          onChange={(e) => onSelectService(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
        >
          <option value="">Choisir un service municipal</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </select>

        {services.length === 0 && (
          <p className="text-xs text-slate-500 leading-5">
            Aucun service municipal validé. Vous pouvez prendre la demande
            directement.
          </p>
        )}

        <button
          onClick={onAssign}
          disabled={!selectedServiceId}
          className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white transition ${
            !selectedServiceId
              ? "bg-slate-300 cursor-not-allowed"
              : "bg-violet-600 hover:bg-violet-700 shadow-sm"
          }`}
        >
          Assigner au service
        </button>

        <button
          onClick={onTake}
          className="w-full rounded-2xl border border-violet-200 bg-violet-50 text-violet-800 px-4 py-3 text-sm font-semibold hover:bg-violet-100 transition"
        >
          Prendre en charge (mairie)
        </button>
      </div>
    </div>
  );
}
