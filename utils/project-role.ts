export type ProjectApiRole = "OWNER" | "PRO" | "CLIENT_VIEWER" | null | undefined;

export function isOwner(role: ProjectApiRole): boolean {
  return role === "OWNER";
}

export function canEditProject(role: ProjectApiRole): boolean {
  return role === "OWNER";
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
