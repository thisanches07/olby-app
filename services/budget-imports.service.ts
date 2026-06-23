import { ApiError, BASE_URL, api } from "./api";
import { getIdToken } from "./token";

/**
 * Import de orçamento por IA. Espelha `budget-imports.ts` do web:
 * o usuário sobe uma planilha .xlsx → backend faz parse + LLM e devolve a
 * estrutura proposta (preview) → usuário ajusta → apply (atômico) cria etapas
 * e faz upsert dos budget-items. O preview consome o medidor mensal de IA.
 */

export type BudgetImportScenario =
  | "GROUPS_WITH_STAGES"
  | "DETAILS_WITH_STAGES"
  | "DETAILS_ONLY_NO_GROUPS"
  | "GROUPS_NO_STAGES"
  | "DETAILS_NO_STAGES";

export type BudgetImportWarningCode =
  | "AMBIGUOUS_HEADER"
  | "GROUP_SUM_MISMATCH"
  | "NO_GROUPS_DETECTED"
  | "STAGE_MATCH_LOW_CONFIDENCE"
  | "TRUNCATED_INPUT"
  | "HEADER_NOT_FOUND"
  | "MISSING_DESCRIPTION_COLUMN"
  | "MISSING_VALUE_COLUMN"
  | "EMPTY_SHEET"
  | "TOO_MANY_ROWS_TRUNCATED"
  | "MERGED_CELLS_PRESENT"
  | "NUMERIC_PARSE_FAILED";

export interface BudgetImportProposedDetail {
  description: string;
  unit: string | null;
  quantity: number | null;
  unitPriceCents: number | null;
  amountCents: number;
  sourceRowIndex: number | null;
}

export interface BudgetImportProposedItem {
  groupName: string;
  totalCents: number;
  details: BudgetImportProposedDetail[];
  suggestedStageId: string | null;
  suggestedNewStageName: string | null;
  /** 0..1 — confiança do match com a etapa. */
  confidence: number;
}

export interface BudgetImportWarning {
  code: BudgetImportWarningCode | string;
  message: string;
  rowIndex?: number | null;
}

export interface BudgetImportPreview {
  scenario: BudgetImportScenario;
  proposedItems: BudgetImportProposedItem[];
  warnings: BudgetImportWarning[];
  parserMeta: {
    totalRows: number;
    headerRowIndex: number | null;
    providerUsed: string;
  };
}

export interface BudgetImportApplyDetailInput {
  description: string;
  unit?: string | null;
  quantity?: number | null;
  unitPriceCents?: number | null;
  amountCents: number;
}

export interface BudgetImportApplyItemInput {
  /** Mapeia o grupo numa etapa existente... */
  stageId?: string;
  /** ...ou cria uma etapa nova com este nome. */
  newStageName?: string;
  totalCents: number;
  notes?: string | null;
  details?: BudgetImportApplyDetailInput[];
}

export interface BudgetImportApplyResponse {
  applied: {
    stageId: string;
    stageName: string;
    stageCreated: boolean;
    budgetItemId: string;
    totalCents: number;
    detailsCount: number;
  }[];
  totalCents: number;
  stagesCreated: number;
  budgetsUpserted: number;
}

export interface BudgetAiImportLimit {
  message: string;
  used: number;
  limit: number;
  resetsAt: string;
}

/**
 * Detecta o erro de limite mensal de import por IA (`BUDGET_AI_IMPORT_LIMIT_REACHED`)
 * a partir do envelope já decodificado pelo `ApiError` (code + details).
 */
export function getBudgetAiImportLimit(error: unknown): BudgetAiImportLimit | null {
  if (!(error instanceof ApiError)) return null;
  if (error.code !== "BUDGET_AI_IMPORT_LIMIT_REACHED") return null;

  const d = error.details ?? {};
  const used = typeof d.used === "number" ? d.used : null;
  const limit = typeof d.limit === "number" ? d.limit : null;
  const resetsAt = typeof d.resetsAt === "string" ? d.resetsAt : null;
  if (used === null || limit === null || resetsAt === null) return null;

  return { message: error.message, used, limit, resetsAt };
}

/** Arquivo escolhido via expo-document-picker (asset). */
export interface PickedFile {
  uri: string;
  name: string;
  mimeType?: string | null;
}

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * Sobe a planilha .xlsx (multipart) e devolve a estrutura proposta.
 * Não passa pelo helper `api` porque o corpo é FormData (boundary próprio).
 */
export async function previewBudgetImport(
  projectId: string,
  file: PickedFile,
): Promise<BudgetImportPreview> {
  const token = await getIdToken();

  const form = new FormData();
  // No RN, o arquivo é descrito por { uri, name, type }.
  form.append("file", {
    uri: file.uri,
    name: file.name || "orcamento.xlsx",
    type: file.mimeType || XLSX_MIME,
  } as unknown as Blob);

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  // Não definir Content-Type — o RN preenche o boundary do multipart.

  const response = await fetch(
    `${BASE_URL}/projects/${projectId}/imports/budget/preview`,
    { method: "POST", body: form, headers },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const envelope =
      body && typeof body === "object"
        ? (body as { error?: { code?: string; message?: string } }).error
        : null;
    const message =
      (body as { message?: string })?.message ||
      envelope?.message ||
      `Erro ${response.status}`;
    throw new ApiError(
      message,
      response.status,
      envelope?.code,
      (envelope as Record<string, unknown>) ?? undefined,
    );
  }

  return (await response.json()) as BudgetImportPreview;
}

/** Aplica o payload ajustado. Atômico no backend (cria stages + upsert budgets). */
export function applyBudgetImport(
  projectId: string,
  items: BudgetImportApplyItemInput[],
) {
  return api.post<BudgetImportApplyResponse>(
    `/projects/${projectId}/imports/budget/apply`,
    { items },
  );
}
