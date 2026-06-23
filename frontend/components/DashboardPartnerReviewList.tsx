"use client";

import Link from "next/link";
import CategoryBadge from "@/components/CategoryBadge";
import { adminFetch } from "@/lib/api";
import {
  formatConfidence,
  getValidationStatusLabel,
  isPartnerUnanalyzed,
  validationStatusClass,
} from "@/lib/partner-validation";
import type { PartnerDetail } from "@/lib/types";

type DashboardPartnerReviewListProps = {
  partners: PartnerDetail[];
  onUpdated: () => void;
  actionId: number | null;
  setActionId: (id: number | null) => void;
};

export default function DashboardPartnerReviewList({
  partners,
  onUpdated,
  actionId,
  setActionId,
}: DashboardPartnerReviewListProps) {
  const confirmValidation = async (partnerId: number) => {
    setActionId(partnerId);
    await adminFetch(`/partners/${partnerId}/confirm-validation`, { method: "POST" });
    onUpdated();
    setActionId(null);
  };

  const revalidatePartner = async (partnerId: number) => {
    setActionId(partnerId);
    await adminFetch(`/partners/${partnerId}/revalidate`, { method: "POST" });
    onUpdated();
    setActionId(null);
  };

  if (partners.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
        <p className="text-sm font-medium text-slate-700">
          Aucun partenaire en attente de confirmation
        </p>
        <p className="text-xs text-slate-500 mt-2">
          Les dossiers douteux ou SIRET invalides apparaîtront ici.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
      {partners.map((partner) => {
        const report = partner.validation_report as { summary?: string } | null;
        const status = partner.validation_status || "pending";
        const unanalyzed = isPartnerUnanalyzed(partner);
        const isBusy = actionId === partner.id;

        return (
          <article
            key={partner.id}
            className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4"
          >
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{partner.name}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {partner.commune_name || "Commune non renseignée"}
                    {partner.siret ? ` · SIRET ${partner.siret}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white border border-slate-200 px-3 py-1 text-xs font-bold text-slate-700">
                    Crédibilité {formatConfidence(partner.validation_confidence)}
                  </span>
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${validationStatusClass(status, partner)}`}
                  >
                    {getValidationStatusLabel(status, partner)}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <CategoryBadge
                  category={partner.category}
                  subtype={partner.subtype}
                />
              </div>

              {unanalyzed ? (
                <p className="text-sm text-slate-600 leading-6">
                  Ce dossier date d&apos;avant l&apos;analyse automatique. Lancez
                  l&apos;analyse pour obtenir un score de crédibilité.
                </p>
              ) : (
                report?.summary && (
                  <p className="text-sm text-slate-700 leading-6 line-clamp-3">
                    {report.summary}
                  </p>
                )
              )}

              <div className="flex flex-wrap gap-2">
                {unanalyzed ? (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => revalidatePartner(partner.id)}
                    className="rounded-xl bg-slate-950 hover:bg-slate-800 text-white px-4 py-2 text-sm font-semibold disabled:opacity-60"
                  >
                    {isBusy ? "Analyse..." : "Lancer l'analyse"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => confirmValidation(partner.id)}
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm font-semibold disabled:opacity-60"
                  >
                    {isBusy ? "Validation..." : "Confirmer"}
                  </button>
                )}
                <Link
                  href="/partners"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Voir le dossier
                </Link>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
