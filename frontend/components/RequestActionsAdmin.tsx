import Link from "next/link";
import StatusBadge from "./StatusBadge";
import type { PartnerSummary, RequestItem } from "@/lib/types";

type RequestActionsAdminProps = {
  request: RequestItem;
  partners: PartnerSummary[];
  selectedPartnerId?: string;
  onSelectPartner: (partnerId: string) => void;
  onAssign: () => void;
  onTake: () => void;
  onMarkDone: () => void;
  onArchive: () => void;
};

function matchingPartners(
  request: RequestItem,
  partners: PartnerSummary[]
): PartnerSummary[] {
  const requestCategory = request.category?.trim().toLowerCase();
  const requestSubtype = request.subtype?.trim().toLowerCase();

  return partners.filter((partner) => {
    const partnerCategory = partner.category?.trim().toLowerCase();
    const partnerSubtype = partner.subtype?.trim().toLowerCase();

    return (
      partner.is_active &&
      partnerCategory === requestCategory &&
      (!requestSubtype ||
        requestSubtype === "autre" ||
        partnerSubtype === requestSubtype)
    );
  });
}

export default function RequestActionsAdmin({
  request,
  partners,
  selectedPartnerId,
  onSelectPartner,
  onAssign,
  onTake,
  onMarkDone,
  onArchive,
}: RequestActionsAdminProps) {
  if (request.assigned_partner_id) {
    return (
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Assignation
          </p>
          <Link
            href={`/partners/${request.assigned_partner_id}`}
            className="text-sm font-semibold text-blue-700 underline underline-offset-2"
          >
            Assigné à {request.partner_name}
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
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-2xl text-sm font-medium transition"
              >
                Prendre
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  const eligiblePartners = matchingPartners(request, partners);

  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
        Assigner à un partenaire
      </p>

      <div className="space-y-3">
        <select
          value={selectedPartnerId || ""}
          onChange={(e) => onSelectPartner(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
        >
          <option value="">Choisir un partenaire</option>
          {eligiblePartners.map((partner) => (
            <option key={partner.id} value={partner.id}>
              {partner.name}
            </option>
          ))}
        </select>

        <button
          onClick={onAssign}
          disabled={!selectedPartnerId}
          className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white transition ${
            !selectedPartnerId
              ? "bg-slate-300 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 shadow-sm"
          }`}
        >
          Assigner la demande
        </button>
      </div>
    </div>
  );
}
