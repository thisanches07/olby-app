export function extractBrazilPhoneDigits(value: string): string {
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("55") && digits.length > 11) {
    return digits.slice(2, 13);
  }

  return digits.slice(0, 11);
}

export function formatBRPhone(value: string): string {
  const d = extractBrazilPhoneDigits(value);

  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function isValidBrazilMobilePhone(value: string): boolean {
  const digits = extractBrazilPhoneDigits(value);
  return /^[1-9]{2}9\d{8}$/.test(digits);
}

export function normalizeBrazilPhone(value: string): string {
  const digits = extractBrazilPhoneDigits(value);
  return digits ? formatBRPhone(digits) : "";
}

export function toBrazilPhoneE164(value: string): string | null {
  const digits = extractBrazilPhoneDigits(value);
  if (!digits) return null;
  return `+55${digits}`;
}

export function toWhatsAppUrl(value: string): string | null {
  const digits = extractBrazilPhoneDigits(value);

  if (!digits || digits.length < 10) return null;

  const withCountryCode = digits.length === 11 ? `55${digits}` : digits;
  return `https://wa.me/${withCountryCode}`;
}
