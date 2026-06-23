import { api } from "./api";

/**
 * Orçamento por etapa (budget-item). Espelha a camada `budget-items.ts` do web.
 * O backend valida o invariante `sum(details.amountCents) === totalCents`
 * quando `details` for não-vazio (responde 422 em divergência), e responde
 * 404 quando a etapa não tem orçamento (o caller trata como "sem orçamento").
 */

export interface BudgetItemDetail {
  id: string;
  description: string;
  unit: string | null;
  quantity: number | null;
  unitPriceCents: number | null;
  amountCents: number;
  position: number;
}

export interface BudgetItem {
  id: string;
  stageId: string;
  totalCents: number;
  notes: string | null;
  details: BudgetItemDetail[];
  createdAt: string;
  updatedAt: string;
}

/** Linha do request — sem id (gerado pelo backend), com position obrigatória. */
export interface BudgetItemDetailInput {
  description: string;
  unit?: string | null;
  quantity?: number | null;
  unitPriceCents?: number | null;
  amountCents: number;
  position: number;
}

export interface UpsertBudgetItemInput {
  totalCents: number;
  notes?: string | null;
  details?: BudgetItemDetailInput[];
}

export interface BudgetVariance {
  absoluteCents: number;
  /** 1 = 100% consumido; > 1 = estouro. */
  ratio: number;
}

export interface StageBudgetSummary {
  stageId: string;
  stageName: string;
  totalBudgetCents: number | null;
  totalExpensedCents: number;
  expensesByCategory: Record<string, number>;
  variance: BudgetVariance | null;
}

export interface ProjectBudgetSummary {
  projectId: string;
  totalBudgetCents: number;
  totalExpensedCents: number;
  expensesByCategory: Record<string, number>;
  byStage: StageBudgetSummary[];
}

export const budgetService = {
  /** 404 quando a etapa não tem orçamento — o caller decide o tratamento. */
  getItem: (projectId: string, stageId: string) =>
    api.get<BudgetItem>(`/projects/${projectId}/stages/${stageId}/budget-item`),

  /** Cria ou substitui o orçamento da etapa. 422 se a soma dos detalhes ≠ total. */
  upsertItem: (
    projectId: string,
    stageId: string,
    input: UpsertBudgetItemInput,
  ) =>
    api.put<BudgetItem>(
      `/projects/${projectId}/stages/${stageId}/budget-item`,
      input,
    ),

  deleteItem: (projectId: string, stageId: string) =>
    api.delete<null>(`/projects/${projectId}/stages/${stageId}/budget-item`),

  getStageSummary: (projectId: string, stageId: string) =>
    api.get<StageBudgetSummary>(
      `/projects/${projectId}/stages/${stageId}/budget-summary`,
    ),

  getProjectSummary: (projectId: string) =>
    api.get<ProjectBudgetSummary>(`/projects/${projectId}/budget-summary`),
};
