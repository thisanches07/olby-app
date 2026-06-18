import type { Etapa, Gasto } from "@/data/obras";

/**
 * Realizado por etapa (centro de custo): soma do valor das despesas agrupadas
 * por stageId, em CENTAVOS (para casar com `budgetCents`). Despesas sem etapa
 * (stageId ausente) são ignoradas no mapa — ficam só no total geral.
 *
 * Obs.: no app o `Gasto.valor` está em R$; convertemos para centavos aqui.
 * Portado de obra-web/src/lib/analytics/stage-costs.ts.
 */
export function spentByStage(gastos: readonly Gasto[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const g of gastos) {
    if (!g.stageId) continue;
    const cents = Math.round(g.valor * 100);
    map.set(g.stageId, (map.get(g.stageId) ?? 0) + cents);
  }
  return map;
}

export interface StageBudgetRollup {
  /** Soma dos orçamentos definidos nas etapas (ignora etapas sem orçamento). */
  budgetedCents: number;
  /** Soma do realizado das despesas vinculadas a alguma etapa. */
  spentOnStagesCents: number;
  /** Realizado de despesas sem etapa vinculada. */
  unassignedCents: number;
  /** Nº de etapas com orçamento definido. */
  stagesWithBudget: number;
}

/** Consolida orçado x realizado das etapas, para o cabeçalho do painel. */
export function buildStageBudgetRollup(
  etapas: readonly Etapa[],
  gastos: readonly Gasto[],
): StageBudgetRollup {
  const spent = spentByStage(gastos);
  let budgetedCents = 0;
  let spentOnStagesCents = 0;
  let stagesWithBudget = 0;

  for (const s of etapas) {
    if (typeof s.budgetCents === "number" && s.budgetCents > 0) {
      budgetedCents += s.budgetCents;
      stagesWithBudget += 1;
    }
    spentOnStagesCents += spent.get(s.id) ?? 0;
  }

  const totalSpent = gastos.reduce(
    (sum, g) => sum + Math.round(g.valor * 100),
    0,
  );

  return {
    budgetedCents,
    spentOnStagesCents,
    unassignedCents: totalSpent - spentOnStagesCents,
    stagesWithBudget,
  };
}
