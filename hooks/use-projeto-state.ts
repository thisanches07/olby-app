import { Gasto, ObraDetalhe, Tarefa } from "@/data/obras";
import { useCallback, useState } from "react";

export interface UseProjetoStateReturn {
  obra: ObraDetalhe;
  addTask: (task: Omit<Tarefa, "id">) => void;
  updateTask: (id: string, updates: Partial<Tarefa>) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => void;
  reorderTasks: (tarefas: Tarefa[]) => void;
  addExpense: (expense: Omit<Gasto, "id">) => void;
  updateExpense: (id: string, updates: Partial<Gasto>) => void;
  deleteExpense: (id: string) => void;
  updateBudget: (newBudget: number, newHoras: number) => void;
}

export function useProjetoState(
  initialObra: ObraDetalhe,
): UseProjetoStateReturn {
  const [obra, setObra] = useState<ObraDetalhe>(initialObra);

  // Calculate total invested from expenses
  const calculateTotalInvestido = useCallback((gastos: Gasto[]): number => {
    return gastos.reduce((sum, gasto) => sum + gasto.valor, 0);
  }, []);

  // Task management
  const addTask = useCallback((task: Omit<Tarefa, "id">) => {
    const newTask: Tarefa = {
      ...task,
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    setObra((prev) => ({
      ...prev,
      tarefas: [newTask, ...prev.tarefas],
    }));
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<Tarefa>) => {
    setObra((prev) => ({
      ...prev,
      tarefas: prev.tarefas.map((task) =>
        task.id === id ? { ...task, ...updates } : task,
      ),
    }));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setObra((prev) => ({
      ...prev,
      tarefas: prev.tarefas.filter((task) => task.id !== id),
    }));
  }, []);

  const toggleTask = useCallback((id: string) => {
    setObra((prev) => ({
      ...prev,
      tarefas: prev.tarefas.map((task) =>
        task.id === id ? { ...task, concluida: !task.concluida } : task,
      ),
    }));
  }, []);

  // Expense management
  const addExpense = useCallback(
    (expense: Omit<Gasto, "id">) => {
      const newExpense: Gasto = {
        ...expense,
        id: `gasto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
      setObra((prev) => {
        const updatedGastos = [newExpense, ...prev.gastos];
        return {
          ...prev,
          gastos: updatedGastos,
          totalInvestido: calculateTotalInvestido(updatedGastos),
        };
      });
    },
    [calculateTotalInvestido],
  );

  const updateExpense = useCallback(
    (id: string, updates: Partial<Gasto>) => {
      setObra((prev) => {
        const updatedGastos = prev.gastos.map((gasto) =>
          gasto.id === id ? { ...gasto, ...updates } : gasto,
        );
        return {
          ...prev,
          gastos: updatedGastos,
          totalInvestido: calculateTotalInvestido(updatedGastos),
        };
      });
    },
    [calculateTotalInvestido],
  );

  const deleteExpense = useCallback(
    (id: string) => {
      setObra((prev) => {
        const updatedGastos = prev.gastos.filter((gasto) => gasto.id !== id);
        return {
          ...prev,
          gastos: updatedGastos,
          totalInvestido: calculateTotalInvestido(updatedGastos),
        };
      });
    },
    [calculateTotalInvestido],
  );

  // Budget + hours management
  const updateBudget = useCallback((newBudget: number, newHoras: number) => {
    setObra((prev) => ({
      ...prev,
      orcamento: newBudget,
      horasContratadas: newHoras,
    }));
  }, []);

  // Task reordering
  const reorderTasks = useCallback((reorderedTarefas: Tarefa[]) => {
    setObra((prev) => ({
      ...prev,
      tarefas: reorderedTarefas,
    }));
  }, []);

  return {
    obra,
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
    reorderTasks,
    addExpense,
    updateExpense,
    deleteExpense,
    updateBudget,
  };
}
