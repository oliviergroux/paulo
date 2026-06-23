export type PartnerValidationCheck = {
  id: string;
  label: string;
  ok: boolean;
  detail?: string;
};

export type PartnerValidationReport = {
  confidence?: number;
  recommendation?: "approve" | "review" | "reject";
  auto_approve?: boolean;
  summary?: string;
  checks?: PartnerValidationCheck[];
};

export type PartnerValidationStatus =
  | "pending"
  | "auto_validated"
  | "needs_review"
  | "admin_validated"
  | "rejected";

export const VALIDATION_STATUS_LABELS: Record<PartnerValidationStatus, string> = {
  pending: "En attente",
  auto_validated: "Validé automatiquement",
  needs_review: "Confirmation admin requise",
  admin_validated: "Validé par admin",
  rejected: "Rejeté par l'IA",
};

export function isPartnerUnanalyzed(partner: {
  validation_status?: string | null;
  validation_confidence?: number | null;
  validation_report?: unknown;
}): boolean {
  return (
    (partner.validation_status || "pending") === "pending" &&
    partner.validation_confidence == null &&
    !partner.validation_report
  );
}

export function getValidationStatusLabel(
  status?: string | null,
  partner?: {
    validation_status?: string | null;
    validation_confidence?: number | null;
    validation_report?: unknown;
  }
): string {
  if (partner && isPartnerUnanalyzed(partner)) {
    return "Non analysé";
  }
  const normalized = (status || "pending") as PartnerValidationStatus;
  return VALIDATION_STATUS_LABELS[normalized] || normalized;
}

export function validationStatusClass(
  status?: string | null,
  partner?: {
    validation_status?: string | null;
    validation_confidence?: number | null;
    validation_report?: unknown;
  }
): string {
  if (partner && isPartnerUnanalyzed(partner)) {
    return "bg-slate-100 text-slate-600";
  }
  switch (status) {
    case "auto_validated":
    case "admin_validated":
      return "bg-emerald-100 text-emerald-700";
    case "needs_review":
      return "bg-amber-100 text-amber-800";
    case "rejected":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export function formatConfidence(value?: number | null): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${Math.round(value * 100)} %`;
}

export function countUnanalyzedPartners(
  partners: {
    validation_status?: string | null;
    validation_confidence?: number | null;
    validation_report?: unknown;
    is_active?: boolean;
  }[]
): number {
  return partners.filter(
    (partner) => !partner.is_active && isPartnerUnanalyzed(partner)
  ).length;
}
