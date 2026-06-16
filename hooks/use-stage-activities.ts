import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getProjectItemLimitMessage,
  PROJECT_ITEM_LIMIT,
} from "@/constants/creation-limits";
import type { ActivityStatus, Atividade } from "@/data/obras";
import {
  activitiesService,
  type ActivityResponseDto,
  type ActivityStatus as ApiActivityStatus,
} from "@/services/activities.service";
import { mapActivity } from "@/utils/stage-mappers";

export interface ActivityFormValues {
  nome: string;
  descricao?: string;
  startDate?: string | null;
  dueDate?: string | null;
  status?: ActivityStatus;
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
}

export function useStageActivities(stageId: string): UseStageActivitiesReturn {
  const [items, setItems] = useState<ActivityResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setItems((prev) => [...prev, created]);
    },
    [stageId, items.length],
  );

  const updateActivity = useCallback(
    async (id: string, values: ActivityFormValues) => {
      const updated = await activitiesService.update(id, {
        name: values.nome,
        description: values.descricao || null,
        startDate: values.startDate ?? null,
        dueDate: values.dueDate ?? null,
        ...(values.status ? { status: values.status as ApiActivityStatus } : {}),
      });
      setItems((prev) => prev.map((a) => (a.id === id ? updated : a)));
    },
    [],
  );

  const setActivityStatus = useCallback(
    async (id: string, status: ActivityStatus) => {
      const previous = items;
      // Otimista
      setItems((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, status: status as ApiActivityStatus } : a,
        ),
      );
      try {
        const updated = await activitiesService.updateStatus(
          id,
          status as ApiActivityStatus,
        );
        setItems((prev) => prev.map((a) => (a.id === id ? updated : a)));
      } catch (e) {
        setItems(previous);
        throw e;
      }
    },
    [items],
  );

  const deleteActivity = useCallback(
    async (id: string) => {
      const previous = items;
      setItems((prev) => prev.filter((a) => a.id !== id));
      try {
        await activitiesService.delete(id);
      } catch (e) {
        setItems(previous);
        throw e;
      }
    },
    [items],
  );

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
  };
}
