type KpiVariant = "default" | "blue" | "red" | "orange" | "emerald" | "slate";

type KpiCardProps = {
  label: string;
  value: number | string;
  active?: boolean;
  variant?: KpiVariant;
  valueClassName?: string;
  onClick?: () => void;
};

const ACTIVE_STYLES: Record<KpiVariant, string> = {
  default: "bg-blue-50 border-blue-500 ring-2 ring-blue-100",
  blue: "bg-blue-50 border-blue-500 ring-2 ring-blue-100",
  red: "bg-red-50 border-red-500 ring-2 ring-red-100",
  orange: "bg-orange-50 border-orange-500 ring-2 ring-orange-100",
  emerald: "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-100",
  slate: "bg-slate-50 border-slate-500 ring-2 ring-slate-100",
};

const HOVER_STYLES: Record<KpiVariant, string> = {
  default: "hover:border-blue-200",
  blue: "hover:border-blue-200",
  red: "hover:border-red-200",
  orange: "hover:border-orange-200",
  emerald: "hover:border-emerald-200",
  slate: "hover:border-slate-300",
};

export default function KpiCard({
  label,
  value,
  active = false,
  variant = "default",
  valueClassName = "",
  onClick,
}: KpiCardProps) {
  const className = `rounded-3xl border p-5 shadow-sm text-left transition ${
    active
      ? ACTIVE_STYLES[variant]
      : `bg-white border-slate-200 ${HOVER_STYLES[variant]}`
  }`;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        <p className="text-sm text-slate-500">{label}</p>
        <p className={`text-3xl font-bold mt-2 ${valueClassName}`}>{value}</p>
      </button>
    );
  }

  return (
    <div className={className}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`text-3xl font-bold mt-2 ${valueClassName}`}>{value}</p>
    </div>
  );
}
