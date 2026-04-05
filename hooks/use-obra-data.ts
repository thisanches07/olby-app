import { useCallback, useEffect, useMemo, useState } from "react";

import type { StatusType } from "@/components/obra-card";
import type { Gasto, ObraDetalhe, Tarefa } from "@/data/obras";
import { useAuth } from "@/hooks/use-auth";
import {
  dailyLogEntriesService,
  type DailyLogEntryResponseDto,
} from "@/services/daily-log-entries.service";
import {
  expensesService,
  type ExpenseResponseDto,
} from "@/services/expenses.service";
import {
  projectsService,
  type ProjectResponseDto,
} from "@/services/projects.service";
import { tasksService, type TaskResponseDto } from "@/services/tasks.service";

type LocalPriority = "ALTA" | "MEDIA" | "BAIXA";
const MAX_EXPENSE_DESCRIPTION = 30;

type LocalCategory = Gasto["categoria"];

function toApiPriority(p: LocalPriority): string {
  const map: Record<LocalPriority, string> = {
    ALTA: "HIGH",
    MEDIA: "MEDIUM",
    BAIXA: "LOW",
  };
  return map[p];
}

function fromApiPriority(p: string): LocalPriority {
  const map: Record<string, LocalPriority> = {
    HIGH: "ALTA",
    MEDIUM: "MEDIA",
    LOW: "BAIXA",
  };
  return map[p] ?? "MEDIA";
}

function toApiTaskStatus(concluida: boolean): string {
  return concluida ? "DONE" : "OPEN";
}

function fromApiTaskStatus(status: string): boolean {
  return status === "DONE";
}

function toApiCategory(c: LocalCategory): string {
  return c;
}

function fromApiCategory(c: string): LocalCategory {
  const valid: LocalCategory[] = [
    "MATERIAL",
    "LABOR",
    "TOOLS",
    "SERVICES",
    "TRANSPORT",
    "FEES",
    "CONTINGENCY",
    "OTHER",
  ];
  return (valid.includes(c as LocalCategory) ? c : "OTHER") as LocalCategory;
}

function fromApiProjectStatus(s: string): StatusType {
  const map: Record<string, StatusType> = {
    ACTIVE: "em_andamento",
    COMPLETED: "concluida",
    ARCHIVED: "pausada",
    PLANNING: "planejamento",
    in_progress: "em_andamento",
    completed: "concluida",
    paused: "pausada",
    planning: "planejamento",
    em_andamento: "em_andamento",
    concluida: "concluida",
    pausada: "pausada",
    planejamento: "planejamento",
  };
  return map[s] ?? "em_andamento";
}

function statusToEtapaLabel(s: string): string {
  const map: Record<string, string> = {
    ACTIVE: "Em Andamento",
    COMPLETED: "Concluida",
    ARCHIVED: "Arquivada",
    PLANNING: "Planejamento",
    in_progress: "Em Andamento",
    em_andamento: "Em Andamento",
    completed: "Concluida",
    concluida: "Concluida",
    paused: "Arquivada",
    pausada: "Arquivada",
    planning: "Planejamento",
    planejamento: "Planejamento",
  };
  return map[s] ?? "Em Andamento";
}

function apiDateToBR(d: string): string {
  if (!d) return "";
  const parts = d.split("-");
  if (parts.length !== 3) return d;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function buildObraDetalhe(
  project: ProjectResponseDto,
  apiTasks: TaskResponseDto[],
  apiExpenses: ExpenseResponseDto[],
  diaryEntries: DailyLogEntryResponseDto[],
): ObraDetalhe {
  const tarefas: Tarefa[] = [...apiTasks]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((t) => ({
      id: t.id,
      titulo: t.title,
      descricao: t.description ?? "",
      prioridade: fromApiPriority(t.priority),
      concluida: fromApiTaskStatus(t.status),
      order: t.position,
    }));

  const gastos: Gasto[] = apiExpenses.map((e) => ({
    id: e.id,
    descricao: e.description ?? "",
    valor: e.amountCents / 100,
    data: e.date,
    categoria: fromApiCategory(e.category),
    tarefaId: e.taskId ?? undefined,
  }));

  const concluidas = tarefas.filter((t) => t.concluida).length;
  const progresso =
    tarefas.length > 0 ? Math.round((concluidas / tarefas.length) * 100) : 0;

  const totalInvestido = gastos.reduce((sum, g) => sum + g.valor, 0);

  const dataInicio = new Date(project.createdAt).toLocaleDateString("pt-BR");
  const dataPrevisaoIso = project.expectedDeliveryAt ?? null;
  const dataPrevisaoFormatted = dataPrevisaoIso
    ? apiDateToBR(dataPrevisaoIso.split("T")[0])
    : null;

  return {
    id: project.id,
    nome: project.name,
    cliente: "",
    endereco: project.address ?? "",
    referencia: "",
    cidade: "",
    estado: "",
    status: fromApiProjectStatus(project.status),
    progresso,
    dataInicio,
    dataPrevisao: dataPrevisaoFormatted ?? "",
    dataPrevisaoEntrega: dataPrevisaoFormatted,
    totalInvestido,
    orcamento: project.budgetCents != null ? project.budgetCents / 100 : 0,
    proximoPagamento: { valor: 0, diasRestantes: 0 },
    etapaAtual: statusToEtapaLabel(project.status),
    proximaEtapa: "",
    tarefas,
    gastos,
    horasContratadas: project.hoursContracted ?? 0,
    horasRealizadas:
      diaryEntries.reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0) / 60,
    trackFinancial: project.trackFinancial ?? true,
    trackActivities: project.trackActivities ?? true,
    myRole: project.myRole ?? null,
  };
}

export interface UseObraDataReturn {
  obra: ObraDetalhe | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addTask: (task: Omit<Tarefa, "id">) => Promise<void>;
  updateTask: (id: string, updates: Partial<Tarefa>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  deleteAllTasks: () => Promise<void>;
  reorderTasks: (orderedIds: string[]) => Promise<void>;
  addExpense: (expense: Omit<Gasto, "id">) => Promise<void>;
  updateExpense: (id: string, updates: Partial<Gasto>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  deleteAllExpenses: () => Promise<void>;
  updateBudget: (newBudget: number, newHoras: number) => Promise<void>;
  updateTrackFinancial: (enabled: boolean) => Promise<void>;
}

export function useObraData(projectId: string): UseObraDataReturn {
  const { user } = useAuth();
  const [project, setProject] = useState<ProjectResponseDto | null>(null);
  const [tasks, setTasks] = useState<TaskResponseDto[]>([]);
  const [expenses, setExpenses] = useState<ExpenseResponseDto[]>([]);
  const [diaryEntries, setDiaryEntries] = useState<DailyLogEntryResponseDto[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = useCallback(
    async (id: string): Promise<ProjectResponseDto> => {
      return await projectsService.getById(id);
    },
    [],
  );

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [proj, taskList, expenseList, entryList] = await Promise.all([
        fetchProject(projectId),
        tasksService.listByProject(projectId),
        expensesService.listByProject(projectId),
        dailyLogEntriesService.listByProject(projectId).catch(() => []),
      ]);
      setProject(proj);
      setTasks(taskList);
      setExpenses(expenseList);
      setDiaryEntries(entryList);
    } catch {
      setError("Nao foi possivel carregar os dados da obra. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [projectId, fetchProject]);

  useEffect(() => {
    setProject(null);
    setTasks([]);
    setExpenses([]);
    setDiaryEntries([]);
    setError(null);
    setLoading(true);
  }, [projectId, user?.uid]);

  useEffect(() => {
    loadData();
  }, [loadData, user?.uid]);

  const obra = useMemo<ObraDetalhe | null>(() => {
    if (!project) return null;
    return buildObraDetalhe(project, tasks, expenses, diaryEntries);
  }, [project, tasks, expenses, diaryEntries]);

  const addTask = useCallback(
    async (taskData: Omit<Tarefa, "id">) => {
      const created = await tasksService.create({
        projectId,
        title: taskData.titulo,
        description: taskData.descricao || undefined,
        priority: toApiPriority(taskData.prioridade),
      });
      setTasks((prev) => [created, ...prev]);
    },
    [projectId],
  );

  const updateTask = useCallback(
    async (id: string, updates: Partial<Tarefa>) => {
      const dto: Record<string, unknown> = {};
      if (updates.titulo !== undefined) dto.title = updates.titulo;
      if (updates.descricao !== undefined)
        dto.description = updates.descricao || null;
      if (updates.prioridade !== undefined)
        dto.priority = toApiPriority(updates.prioridade);
      if (updates.concluida !== undefined)
        dto.status = toApiTaskStatus(updates.concluida);

      const updated = await tasksService.update(id, dto);
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    },
    [],
  );

  const deleteTask = useCallback(
    async (id: string) => {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      try {
        await tasksService.delete(id);
      } catch (e) {
        await loadData();
        throw e;
      }
    },
    [loadData],
  );

  const toggleTask = useCallback(
    async (id: string) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;

      const newStatus = task.status === "DONE" ? "OPEN" : "DONE";
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t)),
      );

      try {
        const updated = await tasksService.update(id, { status: newStatus });
        setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      } catch (e) {
        setTasks((prev) =>
          prev.map((t) => (t.id === id ? { ...t, status: task.status } : t)),
        );
        throw e;
      }
    },
    [tasks],
  );

  const addExpense = useCallback(
    async (expenseData: Omit<Gasto, "id">) => {
      const trimmedDescription = expenseData.descricao
        .trim()
        .slice(0, MAX_EXPENSE_DESCRIPTION);
      const created = await expensesService.create({
        projectId,
        taskId: expenseData.tarefaId ?? null,
        category: toApiCategory(expenseData.categoria),
        description: trimmedDescription || undefined,
        amountCents: Math.round(expenseData.valor * 100),
        date: expenseData.data,
      });
      setExpenses((prev) => [created, ...prev]);
    },
    [projectId],
  );

  const updateExpense = useCallback(
    async (id: string, updates: Partial<Gasto>) => {
      const dto: Record<string, unknown> = {};
      if (updates.descricao !== undefined) {
        dto.description =
          updates.descricao.trim().slice(0, MAX_EXPENSE_DESCRIPTION) || null;
      }
      if (updates.categoria !== undefined)
        dto.category = toApiCategory(updates.categoria);
      if (updates.valor !== undefined)
        dto.amountCents = Math.round(updates.valor * 100);
      if (updates.data !== undefined) dto.date = updates.data;
      if ("tarefaId" in updates) dto.taskId = updates.tarefaId ?? null;

      const updated = await expensesService.update(id, dto);
      setExpenses((prev) => prev.map((e) => (e.id === id ? updated : e)));
    },
    [],
  );

  const deleteExpense = useCallback(
    async (id: string) => {
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      try {
        await expensesService.delete(id);
      } catch (e) {
        await loadData();
        throw e;
      }
    },
    [loadData],
  );

  const deleteAllTasks = useCallback(async () => {
    await tasksService.deleteByProject(projectId);
    setTasks([]);
  }, [projectId]);

  const reorderTasks = useCallback(
    async (orderedIds: string[]) => {
      const previousTasks = tasks;

      setTasks(
        orderedIds
          .map((id, idx) => {
            const t = previousTasks.find((item) => item.id === id);
            return t ? { ...t, position: idx } : null;
          })
          .filter((t): t is TaskResponseDto => t !== null),
      );

      const changed = orderedIds
        .map((id, newIdx) => {
          const oldIdx = previousTasks.findIndex((t) => t.id === id);
          return oldIdx !== newIdx ? { id, position: newIdx } : null;
        })
        .filter((x): x is { id: string; position: number } => x !== null);

      if (changed.length === 0) return;

      try {
        await Promise.all(
          changed.map(({ id, position }) =>
            tasksService.update(id, { position }),
          ),
        );
      } catch {
        setTasks(previousTasks);
      }
    },
    [tasks],
  );

  const deleteAllExpenses = useCallback(async () => {
    await expensesService.deleteByProject(projectId);
    setExpenses([]);
  }, [projectId]);

  const updateBudget = useCallback(
    async (newBudget: number, newHoras: number) => {
      await projectsService.update(projectId, {
        budgetCents: Math.round(newBudget * 100),
        hoursContracted: newHoras,
      });
      setProject((prev) =>
        prev
          ? {
              ...prev,
              budgetCents: Math.round(newBudget * 100),
              hoursContracted: newHoras,
            }
          : null,
      );
    },
    [projectId],
  );

  const updateTrackFinancial = useCallback(
    async (enabled: boolean) => {
      await projectsService.update(projectId, { trackFinancial: enabled });
      setProject((prev) =>
        prev ? { ...prev, trackFinancial: enabled } : null,
      );
    },
    [projectId],
  );

  return {
    obra,
    loading,
    error,
    refresh: loadData,
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
    deleteAllTasks,
    reorderTasks,
    addExpense,
    updateExpense,
    deleteExpense,
    deleteAllExpenses,
    updateBudget,
    updateTrackFinancial,
  };
}
