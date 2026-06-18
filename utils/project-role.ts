export type ProjectApiRole = "OWNER" | "PRO" | "CLIENT_VIEWER" | null | undefined;

export function isOwner(role: ProjectApiRole): boolean {
  return role === "OWNER";
}

/**
 * Estados em que a obra é editável (espelha EDITABLE_PROJECT_STATUSES da web):
 * PLANNING (orçar/montar etapas) e ACTIVE (execução). COMPLETED/ARCHIVED são
 * somente leitura. Aceita tanto os enums do backend quanto os StatusType do app.
 */
const EDITABLE_STATUSES = new Set([
  "PLANNING",
  "ACTIVE",
  "planejamento",
  "em_andamento",
]);

export function isEditableStatus(status: string | null | undefined): boolean {
  return status != null && EDITABLE_STATUSES.has(status);
}

/**
 * Pode escrever na obra quem é OWNER e (quando o status é informado) a obra está
 * em PLANNING ou ACTIVE. Sem `status`, mantém o comportamento legado (só papel).
 */
export function canEditProject(
  role: ProjectApiRole,
  status?: string | null,
): boolean {
  if (!isOwner(role)) return false;
  return status === undefined ? true : isEditableStatus(status);
}

export function canManageMembers(role: ProjectApiRole): boolean {
  return role === "OWNER" || role === "PRO";
}

export function isClientView(role: ProjectApiRole): boolean {
  return role === "CLIENT_VIEWER";
}

export function toAppViewRole(role: ProjectApiRole): "engenheiro" | "cliente" {
  return isClientView(role) ? "cliente" : "engenheiro";
}
