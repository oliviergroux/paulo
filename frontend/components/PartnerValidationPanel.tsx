"use client";

import type { PartnerDetail } from "@/lib/types";
import {
  VALIDATION_STATUS_LABELS,
  formatConfidence,
  validationStatusClass,
  type PartnerValidationReport,
} from "@/lib/partner-validation";

type PartnerValidationPanelProps = {
  partner: PartnerDetail;
  onConfirm?: () => Promise<void>;
  onRevalidate?: () => Promise<void>;
  confirming?: boolean;
  revalidating?: boolean;
};

export default function PartnerValidationPanel({
  partner,
  onConfirm,
  onRevalidate,
  confirming = false,
  revalidating = false,
}: PartnerValidationPanelProps) {
  const status = partner.validation_status || "pending";
  const report = (partner.validation_report || {}) as PartnerValidationReport;
  const checks = report.checks || [];
  const sirene = partner.sirene_snapshot as
    | {
        company_name?: string;
        official_address?: string;
        activite_principale?: string;
        etat_administratif?: string;
      }
    | null
    | undefined;

  const showConfirm =
    !partner.is_active &&
    (status === "needs_review" || status === "rejected" || status === "pending");

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-slate-900">Analyse IA partenaire</p>
        <span
          className={`text-xs font-bold px-3 py-1 rounded-full ${validationStatusClass(status)}`}
        >
          {VALIDATION_STATUS_LABELS[status as keyof typeof VALIDATION_STATUS_LABELS] ||
            status}
        </span>
        {partner.validation_confidence != null && (
          <span className="text-xs text-slate-500">
            Confiance : {formatConfidence(partner.validation_confidence)}
          </span>
        )}
      </div>

      {report.summary && (
        <p className="text-sm text-slate-700 leading-6">{report.summary}</p>
      )}

      {sirene?.company_name && (
        <div className="rounded-2xl bg-white border border-slate-200 p-3 text-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold mb-1">
            Registre SIRENE
          </p>
          <p className="font-medium text-slate-900">{sirene.company_name}</p>
          {sirene.official_address && (
            <p className="text-slate-600 mt-1">{sirene.official_address}</p>
          )}
          {sirene.activite_principale && (
            <p className="text-slate-500 mt-1">NAF {sirene.activite_principale}</p>
          )}
        </div>
      )}

      {checks.length > 0 && (
        <div className="space-y-2">
          {checks.map((check) => (
            <div
              key={check.id}
              className={`rounded-xl px-3 py-2 text-sm border ${
                check.ok
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-amber-200 bg-amber-50 text-amber-900"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{check.label}</span>
                <span className="text-xs font-bold">{check.ok ? "OK" : "À vérifier"}</span>
              </div>
              {check.detail && (
                <p className="text-xs mt-1 opacity-80">{check.detail}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {showConfirm && onConfirm && (
          <button
            type="button"
            disabled={confirming}
            onClick={onConfirm}
            className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
          >
            {confirming ? "Confirmation..." : "Confirmer la validation"}
          </button>
        )}
        {onRevalidate && (
          <button
            type="button"
            disabled={revalidating}
            onClick={onRevalidate}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
          >
            {revalidating ? "Analyse..." : "Relancer l'analyse IA"}
          </button>
        )}
      </div>

      {showConfirm && (
        <p className="text-xs text-slate-500">
          L&apos;IA a pré-analysé ce dossier. Votre confirmation admin est requise
          avant activation.
        </p>
      )}
    </div>
  );
}
