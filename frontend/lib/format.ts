import type { RequestItem } from "./types";

export function formatDate(date?: string | null): string {
  if (!date) return "—";
  const normalized =
    date.endsWith("Z") || date.includes("+") ? date : `${date}Z`;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
  });
}

export function formatDayLabel(dateString: string): string {
  const date = new Date(dateString + "Z");
  const parisDate = new Date(
    date.toLocaleString("en-US", { timeZone: "Europe/Paris" })
  );
  const nowParis = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Paris" })
  );

  const today = new Date(nowParis);
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(nowParis);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const target = new Date(parisDate);
  target.setHours(0, 0, 0, 0);

  if (target.getTime() === today.getTime()) return "Aujourd’hui";
  if (target.getTime() === yesterday.getTime()) return "Hier";

  return target.toLocaleDateString("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function isUrgentRequest(req: Pick<RequestItem, "category">): boolean {
  return req.category === "service_local" || req.category === "mairie";
}

export function getCategoryClass(category: string): string {
  switch (category) {
    case "commerce":
      return "bg-blue-100 text-blue-700";
    case "service_local":
      return "bg-orange-100 text-orange-700";
    case "mairie":
      return "bg-violet-100 text-violet-700";
    case "transport":
      return "bg-emerald-100 text-emerald-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export function phoneTypeLabel(type?: string): string {
  if (type === "mobile") return "Mobile";
  if (type === "landline") return "Fixe";
  if (type === "voip") return "VoIP";
  return "Inconnu";
}

export function phoneTypeClass(type?: string): string {
  if (type === "mobile") return "bg-emerald-100 text-emerald-700";
  if (type === "landline") return "bg-orange-100 text-orange-700";
  if (type === "voip") return "bg-purple-100 text-purple-700";
  return "bg-slate-100 text-slate-700";
}

export function displayClientName(
  firstName?: string | null,
  lastName?: string | null
): string {
  const name = [firstName, lastName].filter(Boolean).join(" ");
  return name || "Client sans nom";
}

export function averageHandlingHours(requests: RequestItem[]): number | null {
  const done = requests.filter((r) => r.status === "done" && r.handled_at);
  if (done.length === 0) return null;

  const totalMs = done.reduce((sum, request) => {
    const created = new Date(request.created_at + "Z").getTime();
    const handled = new Date(request.handled_at! + "Z").getTime();
    return sum + (handled - created);
  }, 0);

  return totalMs / done.length / (1000 * 60 * 60);
}

export function formatHours(value: number | null): string {
  if (value === null) return "—";
  if (value < 1) return `${Math.round(value * 60)} min`;
  if (value < 24) return `${Math.round(value)} h`;

  const days = Math.floor(value / 24);
  const hours = Math.round(value % 24);
  return hours > 0 ? `${days}j ${hours}h` : `${days}j`;
}

export function isMairieRequest(req: Pick<RequestItem, "category">): boolean {
  return req.category?.trim().toLowerCase() === "mairie";
}

export function formatRelativeTime(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString + "Z").getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));

  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} j`;

  return new Date(dateString + "Z").toLocaleDateString("fr-FR", {
    timeZone: "Europe/Paris",
    day: "numeric",
    month: "short",
  });
}
