import { getCategoryClass } from "@/lib/format";

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
        {category}
      </span>
      <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
        {subtype || "autre"}
      </span>
    </>
  );
}
