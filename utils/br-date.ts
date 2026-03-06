// src/utils/br-date.ts

export function maskBRDate(text: string) {
  const digits = text.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function brDateDigitsLen(text: string) {
  return text.replace(/\D/g, "").length;
}

/**
 * Parse DD/MM/YYYY -> Date local (00:00). Retorna null se inválido.
 */
export function parseBRDateToLocalDate(input: string): Date | null {
  const raw = input.trim();
  const m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;

  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yyyy = Number(m[3]);

  if (!Number.isFinite(dd) || !Number.isFinite(mm) || !Number.isFinite(yyyy))
    return null;
  if (mm < 1 || mm > 12) return null;

  const d = new Date(yyyy, mm - 1, dd);
  if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd)
    return null;

  return d;
}

/**
 * Valida data BR com regra de ano: currentYear..2100
 * - Se required=false e vazio => ok (null)
 * - Se shouldShow=false => não retorna erro (null)
 */
export function validateBRDateWithYearRange(params: {
  value: string;
  shouldShow: boolean;
  required?: boolean;
  minYear?: number; // default: currentYear
  maxYear?: number; // default: 2100
}) {
  const { value, shouldShow, required = false } = params;
  const raw = value.trim();
  const digitsLen = brDateDigitsLen(raw);

  if (!shouldShow) return null;

  if (!raw) return required ? "Informe a data." : null;

  // só acusa "complete" se ainda não terminou DDMMYYYY
  if (digitsLen !== 8) return "Complete a data no formato DD/MM/AAAA.";

  const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return "Use o formato DD/MM/AAAA.";

  const yyyy = Number(match[3]);
  const currentYear = new Date().getFullYear();
  const minYear = params.minYear ?? currentYear;
  const maxYear = params.maxYear ?? 2100;

  if (yyyy < minYear || yyyy > maxYear) {
    return `O ano deve estar entre ${minYear} e ${maxYear}.`;
  }

  const parsed = parseBRDateToLocalDate(raw);
  if (!parsed) return "Data inválida (dia ou mês incorreto).";

  return null;
}

/** DD/MM/AAAA -> YYYY-MM-DD (se válida no parse) */
export function brDateToIsoDate(value: string): string | null {
  const d = parseBRDateToLocalDate(value);
  if (!d) return null;

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return `${yyyy}-${mm}-${dd}`;
}
