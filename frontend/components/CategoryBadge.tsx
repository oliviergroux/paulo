import { getCategoryClass } from "@/lib/format";
import { CATEGORY_LABELS, subtypeLabel } from "@/lib/taxonomy";

type CategoryBadgeProps = {
  category: string;
  subtype?: string | null;
};

export default function CategoryBadge({ category, subtype }: CategoryBadgeProps) {
  return (
    <>
      <span
        className={`text-xs font-semibold px-3 py-1 rounded-full ${getCategoryClass(category)}`}
      >
        {CATEGORY_LABELS[category] || category}
      </span>
      <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
        {subtypeLabel(subtype || "autre")}
      </span>
    </>
  );
}
