import type { PartnerDetail, RequestItem } from "./types";
import { CATEGORY_LABELS } from "./taxonomy";

export type AdminCategoryStat = {
  category: string;
  label: string;
  newCount: number;
  inProgressCount: number;
  activeCount: number;
};

const OVERVIEW_CATEGORIES = [
  "commerce",
  "service_local",
  "transport",
  "mairie",
  "autre",
] as const;

export function computeAdminCategoryStats(
  requests: RequestItem[]
): AdminCategoryStat[] {
  const counts = new Map<
    string,
    { newCount: number; inProgressCount: number }
  >();

  for (const category of OVERVIEW_CATEGORIES) {
    counts.set(category, { newCount: 0, inProgressCount: 0 });
  }

  for (const req of requests) {
    if (req.status !== "new" && req.status !== "in_progress") continue;

    const category = OVERVIEW_CATEGORIES.includes(
      req.category as (typeof OVERVIEW_CATEGORIES)[number]
    )
      ? req.category
      : "autre";
    const bucket = counts.get(category)!;

    if (req.status === "new") {
      bucket.newCount += 1;
    } else {
      bucket.inProgressCount += 1;
    }
  }

  return OVERVIEW_CATEGORIES.map((category) => {
    const { newCount, inProgressCount } = counts.get(category)!;
    return {
      category,
      label: CATEGORY_LABELS[category] || category,
      newCount,
      inProgressCount,
      activeCount: newCount + inProgressCount,
    };
  })
    .filter((row) => row.activeCount > 0)
    .sort((a, b) => b.activeCount - a.activeCount);
}

export function countActiveRequests(requests: RequestItem[]): number {
  return requests.filter(
    (req) => req.status === "new" || req.status === "in_progress"
  ).length;
}

export function countPendingPartners(partners: PartnerDetail[]): number {
  return partners.filter((partner) => !partner.is_active).length;
}

export function countActivePartners(partners: PartnerDetail[]): number {
  return partners.filter((partner) => partner.is_active).length;
}

export function getPriorityRequests(
  requests: RequestItem[],
  limit = 5
): RequestItem[] {
  return requests
    .filter((req) => req.status === "new" || req.status === "in_progress")
    .sort((a, b) => {
      if (a.status === "new" && b.status !== "new") return -1;
      if (a.status !== "new" && b.status === "new") return 1;
      return (
        new Date(b.created_at + "Z").getTime() -
        new Date(a.created_at + "Z").getTime()
      );
    })
    .slice(0, limit);
}

export function getPendingPartners(
  partners: PartnerDetail[],
  limit = 5
): PartnerDetail[] {
  return partners
    .filter((partner) => !partner.is_active)
    .slice(0, limit);
}
