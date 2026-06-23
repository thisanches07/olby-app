import { formatCentsBRL } from "@/constants/quote-status";
import type {
  BudgetItem,
  BudgetItemDetailInput,
  UpsertBudgetItemInput,
} from "@/services/budget.service";

/**
 * Lógica pura do editor de orçamento da etapa — porte 1:1 do helper
 * `budget-section.tsx` do web. Mantém o mesmo invariante de validação que o
 * backend (soma dos detalhes === total) para errar cedo, antes do PUT (422).
 */

const TOTAL_MAX_DIGITS = 12;
export const TOTAL_DIGITS_MAX = TOTAL_MAX_DIGITS;

export const UNIT_PRESETS = [
  "vb",
  "un",
  "m",
  "m²",
  "m³",
  "kg",
  "t",
  "h",
  "sc",
  "lt",
];

export interface BudgetEditorRow {
  /** Chave local de lista; não enviada ao backend. */
  key: string;
  description: string;
  unit: string;
  /** Quantidade como texto (usuário digita com vírgula). */
  quantityText: string;
  /** Dígitos do valor unitário em centavos (máscara R$). */
  unitPriceDigits: string;
  /** Dígitos do valor total da linha em centavos (canônico). */
  amountDigits: string;
  /** Se o usuário editou o total à mão, paramos de recomputar qtd×unit. */
  amountManuallyEdited: boolean;
}

export interface BudgetEditorState {
  /** Se a etapa terá orçamento (seção habilitada). */
  enabled: boolean;
  /** Dígitos do total em centavos (máscara R$). */
  totalDigits: string;
  notes: string;
  details: BudgetEditorRow[];
}

let _rowSeq = 0;
export function nextRowKey(): string {
  _rowSeq += 1;
  return `r${Date.now().toString(36)}${_rowSeq}`;
}

export function emptyRow(): BudgetEditorRow {
  return {
    key: nextRowKey(),
    description: "",
    unit: "",
    quantityText: "",
    unitPriceDigits: "",
    amountDigits: "",
    amountManuallyEdited: false,
  };
}

export function emptyBudgetState(): BudgetEditorState {
  return { enabled: false, totalDigits: "", notes: "", details: [] };
}

/** Hidrata o editor a partir de um BudgetItem vindo do backend. */
export function budgetStateFromItem(item: BudgetItem): BudgetEditorState {
  return {
    enabled: true,
    totalDigits: String(item.totalCents),
    notes: item.notes ?? "",
    details: item.details
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((d) => ({
        key: nextRowKey(),
        description: d.description,
        unit: d.unit ?? "",
        quantityText:
          d.quantity === null || d.quantity === undefined
            ? ""
            : String(d.quantity).replace(".", ","),
        unitPriceDigits:
          d.unitPriceCents === null || d.unitPriceCents === undefined
            ? ""
            : String(d.unitPriceCents),
        amountDigits: String(d.amountCents),
        amountManuallyEdited: true,
      })),
  };
}

export function parseQuantity(text: string): number | null {
  if (!text.trim()) return null;
  const n = Number(text.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function digitsToCents(digits: string): number {
  return digits ? Number(digits) : 0;
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, TOTAL_MAX_DIGITS);
}

/** Limpa a entrada de quantidade (permite uma vírgula/ponto). */
export function cleanQuantity(value: string): string {
  return value
    .replace(/[^\d,.-]/g, "")
    .replace(/^-+/, "")
    .replace(/\.{2,}/g, ".")
    .replace(/,{2,}/g, ",");
}

/**
 * Recomputa `amountDigits` a partir de qtd × unitário. Respeita
 * `amountManuallyEdited` — se o usuário editou o total à mão, preserva.
 */
export function recomputeRowAmount(row: BudgetEditorRow): string {
  if (row.amountManuallyEdited) return row.amountDigits;
  const qty = parseQuantity(row.quantityText);
  const unitCents = digitsToCents(row.unitPriceDigits);
  if (qty === null || unitCents === 0) return row.amountDigits;
  return String(Math.round(qty * unitCents));
}

export function budgetSumDetailsCents(state: BudgetEditorState): number {
  return state.details.reduce((acc, r) => acc + digitsToCents(r.amountDigits), 0);
}

export function budgetTotalCents(state: BudgetEditorState): number {
  return digitsToCents(state.totalDigits);
}

export interface BudgetValidationResult {
  ok: boolean;
  reason?: "EMPTY_DETAIL" | "SUM_MISMATCH" | "INVALID_TOTAL";
  message?: string;
}

export function validateBudget(state: BudgetEditorState): BudgetValidationResult {
  if (!state.enabled) return { ok: true };

  const total = budgetTotalCents(state);
  if (total <= 0 && state.details.length === 0) {
    return {
      ok: false,
      reason: "INVALID_TOTAL",
      message: "Informe um valor total ou adicione itens detalhados.",
    };
  }

  const cleanDetails = state.details.filter(
    (r) => r.description.trim().length > 0 || r.amountDigits.length > 0,
  );
  const incomplete = cleanDetails.some((r) => r.description.trim().length === 0);
  if (incomplete) {
    return {
      ok: false,
      reason: "EMPTY_DETAIL",
      message: "Todos os itens detalhados precisam de descrição.",
    };
  }

  if (cleanDetails.length > 0) {
    const sum = cleanDetails.reduce(
      (acc, r) => acc + digitsToCents(r.amountDigits),
      0,
    );
    if (sum !== total) {
      return {
        ok: false,
        reason: "SUM_MISMATCH",
        message: `Soma dos itens (${formatCentsBRL(sum)}) diferente do total (${formatCentsBRL(total)}).`,
      };
    }
  }

  return { ok: true };
}

/**
 * Serializa o estado para o backend. Retorna null quando o orçamento não deve
 * ser enviado (seção desabilitada). O caller deve checar `validateBudget` antes.
 */
export function budgetStateToPayload(
  state: BudgetEditorState,
): UpsertBudgetItemInput | null {
  if (!state.enabled) return null;

  const cleanDetails = state.details.filter(
    (r) => r.description.trim().length > 0,
  );

  const details: BudgetItemDetailInput[] | undefined =
    cleanDetails.length === 0
      ? undefined
      : cleanDetails.map((r, idx) => ({
          description: r.description.trim().slice(0, 160),
          unit: r.unit.trim() ? r.unit.trim().slice(0, 20) : null,
          quantity: parseQuantity(r.quantityText),
          unitPriceCents: r.unitPriceDigits
            ? digitsToCents(r.unitPriceDigits)
            : null,
          amountCents: digitsToCents(r.amountDigits),
          position: idx,
        }));

  return {
    totalCents: budgetTotalCents(state),
    notes: state.notes.trim() ? state.notes.trim() : null,
    details,
  };
}
