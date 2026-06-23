export function normalizeCompanyIdentifierDigits(raw: string): string {
  return (raw || "").replace(/\D/g, "");
}

export function isValidCompanyIdentifier(raw: string): boolean {
  const digits = normalizeCompanyIdentifierDigits(raw);
  return digits.length === 9 || digits.length === 14;
}

export function companyIdentifierHint(raw: string): string | null {
  const digits = normalizeCompanyIdentifierDigits(raw);
  if (!digits) return null;
  if (digits.length === 9) return "SIREN détecté (9 chiffres) — siège social utilisé";
  if (digits.length === 14) return "SIRET détecté (14 chiffres)";
  if (digits.length < 9) return `${digits.length}/9 ou 14 chiffres`;
  if (digits.length < 14) return `${digits.length}/14 chiffres (ou 9 pour un SIREN)`;
  return "Maximum 14 chiffres (SIRET) ou 9 (SIREN)";
}
