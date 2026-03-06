import { Tarefa } from "@/data/obras";

export interface EtapasCalculadas {
  etapaAtual: string;
  proximaEtapa: string;
}

/**
 * Calcula a etapa atual e próxima etapa baseado na ordem das tarefas
 * Etapa atual = primeira tarefa não concluída
 * Próxima etapa = segunda tarefa não concluída
 */
export function getEtapasFromTarefas(tarefas: Tarefa[]): EtapasCalculadas {
  // Ordenar tarefas pelo field 'order'
  const sortedTarefas = [...tarefas].sort((a, b) => a.order - b.order);

  // Encontrar tarefas não concluídas
  const incompletas = sortedTarefas.filter((t) => !t.concluida);

  // Se não houver tarefas não concluídas
  if (incompletas.length === 0) {
    return {
      etapaAtual: "Concluído",
      proximaEtapa: "—",
    };
  }

  // Primeira não concluída = etapa atual
  const etapaAtual = incompletas[0]?.titulo || "Concluído";

  // Segunda não concluída = próxima etapa (ou "—" se não houver)
  const proximaEtapa = incompletas[1]?.titulo || "—";

  return {
    etapaAtual,
    proximaEtapa,
  };
}

/**
 * Recalcula o campo 'order' de um array de tarefas
 * Mantém a ordem do array mas atualiza os campos order de forma sequencial
 */
export function recalculateTaskOrder(tarefas: Tarefa[]): Tarefa[] {
  return tarefas.map((tarefa, index) => ({
    ...tarefa,
    order: index,
  }));
}
