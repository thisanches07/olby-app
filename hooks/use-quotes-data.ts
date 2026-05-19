import { useCallback, useEffect, useState } from "react";

import {
  quotesService,
  type CreateQuoteGroupInput,
  type CreateQuoteInput,
  type QuoteGroupResponse,
  type SupplierSuggestion,
  type UpdateQuoteGroupInput,
  type UpdateQuoteInput,
} from "@/services/quotes.service";

// ─── Lista de demandas (aba Orçamentos) ───────────────────────────────────────

export function useProjectQuotes(projectId: string | undefined) {
  const [groups, setGroups] = useState<QuoteGroupResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = useCallback(
    async (mode: "initial" | "refresh") => {
      if (!projectId) return;
      if (mode === "initial") setIsLoading(true);
      if (mode === "refresh") setIsRefreshing(true);
      setError(null);
      try {
        const data = await quotesService.listByProject(projectId);
        setGroups(data);
      } catch {
        setError("Não foi possível carregar os orçamentos.");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [projectId],
  );

  useEffect(() => {
    if (!projectId) return;
    void fetchGroups("initial");
  }, [fetchGroups, projectId]);

  const refresh = useCallback(() => fetchGroups("refresh"), [fetchGroups]);

  const createGroup = useCallback(
    async (input: CreateQuoteGroupInput) => {
      const created = await quotesService.createGroup(input);
      setGroups((prev) => [created, ...prev]);
      return created;
    },
    [],
  );

  const updateGroup = useCallback(
    async (id: string, input: UpdateQuoteGroupInput) => {
      const updated = await quotesService.updateGroup(id, input);
      setGroups((prev) => prev.map((g) => (g.id === id ? updated : g)));
      return updated;
    },
    [],
  );

  const deleteGroup = useCallback(async (id: string) => {
    await quotesService.deleteGroup(id);
    setGroups((prev) => prev.filter((g) => g.id !== id));
  }, []);

  return {
    groups,
    isLoading,
    isRefreshing,
    error,
    refresh,
    createGroup,
    updateGroup,
    deleteGroup,
  };
}

// ─── Detalhe de uma demanda ───────────────────────────────────────────────────

export function useQuoteGroup(groupId: string | undefined) {
  const [group, setGroup] = useState<QuoteGroupResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!groupId) return;
    setIsLoading(true);
    setError(null);
    try {
      setGroup(await quotesService.getGroup(groupId));
    } catch {
      setError("Não foi possível carregar a demanda.");
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    void load();
  }, [load]);

  const withSaving = useCallback(
    async (fn: () => Promise<QuoteGroupResponse>) => {
      setIsSaving(true);
      try {
        const updated = await fn();
        setGroup(updated);
        return updated;
      } finally {
        setIsSaving(false);
      }
    },
    [],
  );

  const addQuote = useCallback(
    (input: CreateQuoteInput) =>
      withSaving(() => quotesService.addQuote(input)),
    [withSaving],
  );

  const updateQuote = useCallback(
    (id: string, input: UpdateQuoteInput) =>
      withSaving(() => quotesService.updateQuote(id, input)),
    [withSaving],
  );

  const deleteQuote = useCallback(
    (id: string) => withSaving(() => quotesService.deleteQuote(id)),
    [withSaving],
  );

  const updateGroup = useCallback(
    (input: UpdateQuoteGroupInput) =>
      withSaving(() => quotesService.updateGroup(groupId!, input)),
    [groupId, withSaving],
  );

  const choose = useCallback(
    (quoteId: string) =>
      withSaving(() => quotesService.choose(groupId!, quoteId)),
    [groupId, withSaving],
  );

  const reopen = useCallback(
    () => withSaving(() => quotesService.reopen(groupId!)),
    [groupId, withSaving],
  );

  const deleteGroup = useCallback(async () => {
    if (!groupId) return;
    await quotesService.deleteGroup(groupId);
  }, [groupId]);

  const fetchSupplierSuggestions = useCallback(
    async (q?: string): Promise<SupplierSuggestion[]> => {
      if (!group?.projectId) return [];
      try {
        return await quotesService.supplierSuggestions(group.projectId, q);
      } catch {
        return [];
      }
    },
    [group?.projectId],
  );

  return {
    group,
    isLoading,
    isSaving,
    error,
    refresh: load,
    addQuote,
    updateQuote,
    deleteQuote,
    updateGroup,
    choose,
    reopen,
    deleteGroup,
    fetchSupplierSuggestions,
  };
}
