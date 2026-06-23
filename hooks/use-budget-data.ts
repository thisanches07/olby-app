import { useCallback, useEffect, useState } from "react";

import { ApiError } from "@/services/api";
import {
  budgetService,
  type BudgetItem,
  type ProjectBudgetSummary,
  type UpsertBudgetItemInput,
} from "@/services/budget.service";

function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

/**
 * Orçamento de uma etapa. O GET responde 404 quando a etapa não tem orçamento
 * — tratamos como `item = null` (estado válido), não como erro.
 */
export function useStageBudget(
  projectId: string | undefined,
  stageId: string | undefined,
) {
  const [item, setItem] = useState<BudgetItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId || !stageId) return;
    setIsLoading(true);
    setError(null);
    try {
      setItem(await budgetService.getItem(projectId, stageId));
    } catch (e) {
      if (isNotFound(e)) {
        setItem(null);
      } else {
        setError("Não foi possível carregar o orçamento da etapa.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [projectId, stageId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(
    async (input: UpsertBudgetItemInput) => {
      if (!projectId || !stageId) return null;
      setIsSaving(true);
      try {
        const saved = await budgetService.upsertItem(projectId, stageId, input);
        setItem(saved);
        return saved;
      } finally {
        setIsSaving(false);
      }
    },
    [projectId, stageId],
  );

  const remove = useCallback(async () => {
    if (!projectId || !stageId) return;
    setIsSaving(true);
    try {
      await budgetService.deleteItem(projectId, stageId);
      setItem(null);
    } finally {
      setIsSaving(false);
    }
  }, [projectId, stageId]);

  return { item, isLoading, isSaving, error, refresh: load, save, remove };
}

/** Resumo de orçamento do projeto (orçado × gasto × variance por etapa). */
export function useProjectBudgetSummary(projectId: string | undefined) {
  const [summary, setSummary] = useState<ProjectBudgetSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    setError(null);
    try {
      setSummary(await budgetService.getProjectSummary(projectId));
    } catch {
      setError("Não foi possível carregar o resumo do orçamento.");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { summary, isLoading, error, refresh: load };
}
