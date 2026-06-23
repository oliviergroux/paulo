type RequestStatus = "new" | "in_progress" | "done" | string;

type StatusBadgeProps = {
  status: RequestStatus;
  size?: "sm" | "md";
};

const STATUS_STYLES: Record<string, string> = {
  new: "text-slate-700 bg-white border border-slate-200",
  in_progress: "text-orange-700 bg-orange-100",
  done: "text-emerald-700 bg-emerald-100",
};

const STATUS_LABELS: Record<string, string> = {
  new: "Nouveau",
  in_progress: "En cours",
  done: "Traité",
};

export default function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const sizeClass = size === "sm" ? "text-xs" : "text-sm";
  const label = STATUS_LABELS[status] || status;

  return (
    <span
      className={`inline-flex font-semibold px-3 py-1 rounded-full ${sizeClass} ${
        STATUS_STYLES[status] || "bg-slate-100 text-slate-700"
      }`}
    >
      {label}
    </span>
  );
}
