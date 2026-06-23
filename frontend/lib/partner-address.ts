export function normalizePostalCode(raw: string): string {
  return (raw || "").replace(/\D/g, "").slice(0, 5);
}

export function isValidPostalCode(raw: string): boolean {
  return normalizePostalCode(raw).length === 5;
}

export function isValidEmail(raw: string): boolean {
  const cleaned = (raw || "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned);
}

export function formatPartnerFullAddress(partner: {
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
}): string {
  const line = (partner.address || "").trim();
  const postal = (partner.postal_code || "").trim();
  const city = (partner.city || "").trim();
  const locality = [postal, city].filter(Boolean).join(" ");
  return [line, locality].filter(Boolean).join(", ");
}
