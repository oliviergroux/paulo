import type { RequestItem } from "./types";
import { MAIRIE_SERVICES, subtypeLabel } from "./taxonomy";

export type MairieTopicStat = {
  subtype: string;
  label: string;
  newCount: number;
  inProgressCount: number;
  activeCount: number;
};

export function computeMairieTopicStats(
  requests: RequestItem[]
): MairieTopicStat[] {
  const counts = new Map<string, { newCount: number; inProgressCount: number }>();

  for (const service of MAIRIE_SERVICES) {
    counts.set(service, { newCount: 0, inProgressCount: 0 });
  }

  for (const req of requests) {
    if (req.status !== "new" && req.status !== "in_progress") continue;

    const subtype = req.subtype?.trim().toLowerCase() || "autre";
    if (!counts.has(subtype)) {
      counts.set(subtype, { newCount: 0, inProgressCount: 0 });
    }

    const bucket = counts.get(subtype)!;
    if (req.status === "new") {
      bucket.newCount += 1;
    } else {
      bucket.inProgressCount += 1;
    }
  }

  return [...counts.entries()]
    .map(([subtype, { newCount, inProgressCount }]) => ({
      subtype,
      label: subtypeLabel(subtype),
      newCount,
      inProgressCount,
      activeCount: newCount + inProgressCount,
    }))
    .filter((row) => row.activeCount > 0)
    .sort((a, b) => b.activeCount - a.activeCount);
}

export function countActiveMairieRequests(requests: RequestItem[]): number {
  return requests.filter(
    (req) => req.status === "new" || req.status === "in_progress"
  ).length;
}
