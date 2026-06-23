import type { RequestItem } from "./types";
import {
  MAIRIE_SERVICES,
  normalizeMairieTopicKey,
  subtypeLabel,
} from "./taxonomy";

export type MairieTopicStat = {
  subtype: string;
  label: string;
  newCount: number;
  inProgressCount: number;
  activeCount: number;
};

/** Sujet municipal = service assigné en priorité, sinon sous-type IA normalisé. */
export function resolveMairieTopic(req: RequestItem): string {
  return (
    normalizeMairieTopicKey(req.assigned_service) ??
    normalizeMairieTopicKey(req.subtype) ??
    "autre"
  );
}

export function computeMairieTopicStats(
  requests: RequestItem[]
): MairieTopicStat[] {
  const counts = new Map<string, { newCount: number; inProgressCount: number }>();

  for (const service of MAIRIE_SERVICES) {
    counts.set(service, { newCount: 0, inProgressCount: 0 });
  }

  for (const req of requests) {
    if (req.status !== "new" && req.status !== "in_progress") continue;

    const topic = resolveMairieTopic(req);
    const bucket = counts.get(topic)!;

    if (req.status === "new") {
      bucket.newCount += 1;
    } else {
      bucket.inProgressCount += 1;
    }
  }

  return MAIRIE_SERVICES.map((subtype) => {
    const { newCount, inProgressCount } = counts.get(subtype)!;
    return {
      subtype,
      label: subtypeLabel(subtype),
      newCount,
      inProgressCount,
      activeCount: newCount + inProgressCount,
    };
  })
    .filter((row) => row.activeCount > 0)
    .sort((a, b) => b.activeCount - a.activeCount);
}

export function countActiveMairieRequests(requests: RequestItem[]): number {
  return requests.filter(
    (req) => req.status === "new" || req.status === "in_progress"
  ).length;
}

export function countActiveMairieTopics(stats: MairieTopicStat[]): number {
  return stats.filter((row) => row.activeCount > 0).length;
}
