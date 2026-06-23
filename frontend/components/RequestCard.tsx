import CategoryBadge from "./CategoryBadge";
import ClientInfoBlock from "./ClientInfoBlock";
import { formatDate, isUrgentRequest } from "@/lib/format";
import type { RequestItem } from "@/lib/types";

type RequestCardProps = {
  request: RequestItem;
  highlighted?: boolean;
  actions?: React.ReactNode;
  actionsWidth?: "narrow" | "wide";
};

export default function RequestCard({
  request,
  highlighted = false,
  actions,
  actionsWidth = "wide",
}: RequestCardProps) {
  const actionsCol =
    actionsWidth === "wide" ? "xl:grid-cols-[1fr_340px]" : "lg:grid-cols-[1fr_260px]";

  return (
    <article
      className={`rounded-[28px] border bg-white shadow-sm transition-all ${
        highlighted
          ? "border-yellow-300 bg-yellow-50 animate-fade-in-row"
          : "border-slate-200 hover:border-blue-200 hover:shadow-md"
      }`}
    >
      <div className={`p-5 md:p-6 grid grid-cols-1 ${actionsCol} gap-6`}>
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {isUrgentRequest(request) && (
              <span className="text-xs font-bold bg-red-100 text-red-700 px-3 py-1 rounded-full">
                URGENT
              </span>
            )}

            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              {formatDate(request.created_at)}
            </span>

            <span className="text-xs font-medium text-slate-700 bg-slate-100 px-3 py-1 rounded-full">
              {request.phone}
            </span>

            <CategoryBadge
              category={request.category}
              subtype={request.subtype}
            />
          </div>

          <p className="text-lg leading-7 text-slate-900">{request.transcription}</p>

          <ClientInfoBlock
            firstName={request.first_name}
            lastName={request.last_name}
            address={request.address}
          />
        </div>

        {actions && (
          <div className="rounded-3xl bg-slate-50 border border-slate-200 p-4">
            {actions}
          </div>
        )}
      </div>
    </article>
  );
}
