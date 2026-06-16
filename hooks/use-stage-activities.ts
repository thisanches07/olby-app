import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  getProjectItemLimitMessage,
  PROJECT_ITEM_LIMIT,
} from "@/constants/creation-limits";
import type { ActivityStatus, Atividade, StageStatus } from "@/data/obras";
import {
  activitiesService,
  type ActivityResponseDto,
  type ActivityStatus as ApiActivityStatus,
} from "@/services/activities.service";
import { deriveStageStatus, mapActivity } from "@/utils/stage-mappers";

export interface ActivityFormValues {
  nome: string;
  descricao?: string;
  startDate?: string | null;
  dueDate?: string | null;
  status?: ActivityStatus;
}

interface UseStageActivitiesOptions {
  /** Chamado após mutações que afetam status, com o status derivado das
   * atividades. NÃO é chamado no load inicial. */
  onStatusDerived?: (status: StageStatus) => void;
}

export interface UseStageActivitiesReturn {
  atividades: Atividade[];
  loading: boolean;
  error: string | null;
  total: number;
  completed: number;
  /** Razão 0..1 ou null quando não há atividades. */
  progress: number | null;
  refresh: () => Promise<void>;
  addActivity: (values: ActivityFormValues) => Promise<void>;
  updateActivity: (id: string, values: ActivityFormValues) => Promise<void>;
  setActivityStatus: (id: string, status: ActivityStatus) => Promise<void>;
  deleteActivity: (id: string) => Promise<void>;
  reorderActivities: (orderedIds: string[]) => Promise<void>;
  completeAllActivities: () => Promise<void>;
}

export function useStageActivities(
  stageId: string,
  options?: UseStageActivitiesOptions,
): UseStageActivitiesReturn {
  const [items, setItems] = useState<ActivityResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ref evita recriar callbacks quando o handler muda de identidade.
  const onStatusDerivedRef = useRef(options?.onStatusDerived);
  onStatusDerivedRef.current = options?.onStatusDerived;

  const emitDerived = useCallback((next: { status: ApiActivityStatus }[]) => {
    onStatusDerivedRef.current?.(deriveStageStatus(next));
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await activitiesService.listByStage(stageId);
      setItems(list);
    } catch {
      setError("Não foi possível carregar as atividades. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [stageId]);

  useEffect(() => {
    setItems([]);
    setError(null);
    setLoading(true);
  }, [stageId]);

  useEffect(() => {
    load();
  }, [load]);

  const atividades = useMemo<Atividade[]>(
    () =>
      [...items]
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map(mapActivity),
    [items],
  );

  const total = items.length;
  const completed = items.filter((a) => a.status === "DONE").length;
  const progress = total > 0 ? completed / total : null;

  const addActivity = useCallback(
    async (values: ActivityFormValues) => {
      if (items.length >= PROJECT_ITEM_LIMIT) {
        throw new Error(getProjectItemLimitMessage("atividades"));
      }
      const created = await activitiesService.create(stageId, {
        name: values.nome,
        description: values.descricao || undefined,
        status: values.status as ApiActivityStatus | undefined,
        startDate: values.startDate ?? undefined,
        dueDate: values.dueDate ?? undefined,
        position: items.length,
      });
      const next = [...items, created];
      setItems(next);
      emitDerived(next);
    },
    [stageId, items, emitDerived],
  );

  const updateActivity = useCallback(
    async (id: string, values: ActivityFormValues) => {
      const prevItem = items.find((a) => a.id === id);
      const updated = await activitiesService.update(id, {
        name: values.nome,
        description: values.descricao || null,
        startDate: values.startDate ?? null,
        dueDate: values.dueDate ?? null,
        ...(values.status ? { status: values.status as ApiActivityStatus } : {}),
      });
      const next = items.map((a) => (a.id === id ? updated : a));
      setItems(next);
      // Só re-deriva o status da etapa se o status da atividade mudou.
      if (prevItem && prevItem.status !== updated.status) emitDerived(next);
    },
    [items, emitDerived],
  );

  const setActivityStatus = useCallback(
    async (id: string, status: ActivityStatus) => {
      const previous = items;
      const optimistic = previous.map((a) =>
        a.id === id ? { ...a, status: status as ApiActivityStatus } : a,
      );
      setItems(optimistic);
      try {
        const updated = await activitiesService.updateStatus(
          id,
          status as ApiActivityStatus,
        );
        const next = previous.map((a) => (a.id === id ? updated : a));
        setItems(next);
        emitDerived(next);
      } catch (e) {
        setItems(previous);
        throw e;
      }
    },
    [items, emitDerived],
  );

  const deleteActivity = useCallback(
    async (id: string) => {
      const previous = items;
      const next = previous.filter((a) => a.id !== id);
      setItems(next);
      try {
        await activitiesService.delete(id);
        emitDerived(next);
      } catch (e) {
        setItems(previous);
        throw e;
      }
    },
    [items, emitDerived],
  );

  const reorderActivities = useCallback(
    async (orderedIds: string[]) => {
      const previous = items;
      setItems(
        orderedIds
          .map((id, idx) => {
            const a = previous.find((item) => item.id === id);
            return a ? { ...a, position: idx } : null;
          })
          .filter((a): a is ActivityResponseDto => a !== null),
      );

      const changed = orderedIds
        .map((id, newIdx) => {
          const oldIdx = previous.findIndex((a) => a.id === id);
          return oldIdx !== newIdx ? { id, position: newIdx } : null;
        })
        .filter((x): x is { id: string; position: number } => x !== null);

      if (changed.length === 0) return;

      try {
        await Promise.all(
          changed.map(({ id, position }) =>
            activitiesService.update(id, { position }),
          ),
        );
      } catch {
        setItems(previous);
      }
    },
    [items],
  );

  const completeAllActivities = useCallback(async () => {
    const previous = items;
    const pending = previous.filter((a) => a.status !== "DONE");
    if (pending.length === 0) {
      emitDerived(previous);
      return;
    }
    const next = previous.map((a) => ({
      ...a,
      status: "DONE" as ApiActivityStatus,
    }));
    setItems(next);
    try {
      await Promise.all(
        pending.map((a) => activitiesService.updateStatus(a.id, "DONE")),
      );
      emitDerived(next);
    } catch (e) {
      setItems(previous);
      throw e;
    }
  }, [items, emitDerived]);

  return {
    atividades,
    loading,
    error,
    total,
    completed,
    progress,
    refresh: load,
    addActivity,
    updateActivity,
    setActivityStatus,
    deleteActivity,
    reorderActivities,
    completeAllActivities,
  };
}

