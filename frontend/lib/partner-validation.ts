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
  pending: "Analyse en cours",
  auto_validated: "Validé automatiquement",
  needs_review: "Confirmation admin requise",
  admin_validated: "Validé par admin",
  rejected: "Rejeté par l'IA",
};

export function validationStatusClass(status?: string | null): string {
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
