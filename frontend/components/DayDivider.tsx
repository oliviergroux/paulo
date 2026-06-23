type DayDividerProps = {
  label: string;
};

export default function DayDivider({ label }: DayDividerProps) {
  return (
    <div className="sticky top-0 z-20 bg-[#f6f8fb]/95 backdrop-blur py-3">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200" />
        <span
          className={`text-sm font-semibold px-4 py-1.5 rounded-full border ${
            label === "Aujourd’hui"
              ? "text-white bg-slate-950 border-slate-950 shadow-sm"
              : "text-slate-700 bg-white border-slate-200"
          }`}
        >
          {label}
        </span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>
    </div>
  );
}
