import { Gasto, Tarefa } from "@/data/obras";
import { useState } from "react";

const PROJECT_NAME_MAX = 30;
const PROJECT_ADDRESS_MAX = 50;

interface CreateProjectFormState {
  nome: string;
  endereco: string;
  tarefas: Tarefa[];
  gastos: Gasto[];
  orcamento: string;
  horasContratadas: string;
  errors: {
    nome?: string;
    endereco?: string;
  };
}

interface CreateProjectFormActions {
  setNome: (nome: string) => void;
  setEndereco: (endereco: string) => void;
  setOrcamento: (orcamento: string) => void;
  setHorasContratadas: (horas: string) => void;
  addTarefa: (tarefa: Omit<Tarefa, "id" | "order" | "concluida">) => void;
  removeTarefa: (id: string) => void;
  reorderTarefas: (tarefas: Tarefa[]) => void;
  addGasto: (gasto: Omit<Gasto, "id">) => void;
  removeGasto: (id: string) => void;
  validate: () => boolean;
  getTotalGastos: () => number;
  getTotalPorCategoria: (categoria: string) => number;
  reset: () => void;
}

const generateId = () =>
  `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export function useCreateProjectForm(): [
  CreateProjectFormState,
  CreateProjectFormActions,
] {
  const [state, setState] = useState<CreateProjectFormState>({
    nome: "",
    endereco: "",
    tarefas: [],
    gastos: [],
    orcamento: "",
    horasContratadas: "",
    errors: {},
  });

  const setNome = (nome: string) => {
    setState((prev) => {
      const newErrors = { ...prev.errors };
      delete newErrors.nome;
      return {
        ...prev,
        nome: nome.slice(0, PROJECT_NAME_MAX),
        errors: newErrors,
      };
    });
  };

  const setEndereco = (endereco: string) => {
    setState((prev) => {
      const newErrors = { ...prev.errors };
      delete newErrors.endereco;
      return {
        ...prev,
        endereco: endereco.slice(0, PROJECT_ADDRESS_MAX),
        errors: newErrors,
      };
    });
  };

  const setOrcamento = (orcamento: string) => {
    // Remove non-numeric characters
    const numeric = orcamento.replace(/\D/g, "");
    setState((prev) => ({
      ...prev,
      orcamento: numeric,
    }));
  };

  const setHorasContratadas = (horas: string) => {
    const numeric = horas.replace(/\D/g, "");
    setState((prev) => ({
      ...prev,
      horasContratadas: numeric,
    }));
  };

  const addTarefa = (tarefa: Omit<Tarefa, "id" | "order" | "concluida">) => {
    if (!tarefa.titulo.trim()) return;

    const newTarefa: Tarefa = {
      id: `task-${generateId()}`,
      titulo: tarefa.titulo,
      descricao: tarefa.descricao || "",
      prioridade: tarefa.prioridade,
      concluida: false,
      order: state.tarefas.length,
    };

    setState((prev) => ({
      ...prev,
      tarefas: [...prev.tarefas, newTarefa],
    }));
  };

  const removeTarefa = (id: string) => {
    setState((prev) => ({
      ...prev,
      tarefas: prev.tarefas.filter((t) => t.id !== id),
    }));
  };

  const reorderTarefas = (tarefas: Tarefa[]) => {
    setState((prev) => ({
      ...prev,
      tarefas: tarefas.map((t, idx) => ({ ...t, order: idx })),
    }));
  };

  const addGasto = (gasto: Omit<Gasto, "id">) => {
    if (!gasto.descricao.trim() || gasto.valor <= 0) return;

    const newGasto: Gasto = {
      id: `gasto-${generateId()}`,
      ...gasto,
    };

    setState((prev) => ({
      ...prev,
      gastos: [...prev.gastos, newGasto],
    }));
  };

  const removeGasto = (id: string) => {
    setState((prev) => ({
      ...prev,
      gastos: prev.gastos.filter((g) => g.id !== id),
    }));
  };

  const validate = (): boolean => {
    const errors: typeof state.errors = {};

    if (!state.nome.trim()) {
      errors.nome = "Nome do projeto é obrigatório";
    }

    if (!state.endereco.trim()) {
      errors.endereco = "Endereço é obrigatório";
    }

    setState((prev) => ({
      ...prev,
      errors,
    }));

    return Object.keys(errors).length === 0;
  };

  const getTotalGastos = (): number => {
    return state.gastos.reduce((sum, gasto) => sum + gasto.valor, 0);
  };

  const getTotalPorCategoria = (categoria: string): number => {
    return state.gastos
      .filter((g) => g.categoria === categoria)
      .reduce((sum, g) => sum + g.valor, 0);
  };

  const reset = () => {
    setState({
      nome: "",
      endereco: "",
      tarefas: [],
      gastos: [],
      orcamento: "",
      horasContratadas: "",
      errors: {},
    });
  };

  const actions: CreateProjectFormActions = {
    setNome,
    setEndereco,
    setOrcamento,
    setHorasContratadas,
    addTarefa,
    removeTarefa,
    reorderTarefas,
    addGasto,
    removeGasto,
    validate,
    getTotalGastos,
    getTotalPorCategoria,
    reset,
  };

  return [state, actions];
}
