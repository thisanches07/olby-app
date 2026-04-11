export const PROJECT_ITEM_LIMIT = 500;
export const CREATE_PROJECT_TASK_LIMIT = 100;

export type LimitedProjectItem = "tarefas" | "gastos" | "registros";

const ITEM_LABELS: Record<LimitedProjectItem, string> = {
  tarefas: "tarefas",
  gastos: "gastos",
  registros: "registros do diário de obra",
};

export function getProjectItemLimitMessage(item: LimitedProjectItem): string {
  return `Você atingiu o limite de ${PROJECT_ITEM_LIMIT} ${ITEM_LABELS[item]}. Exclua alguns itens para liberar novas inserções.`;
}
