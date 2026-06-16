import { api } from "./api";
import type { ActivityResponseDto } from "./activities.service";

export type ProjectStatus = "ACTIVE" | "COMPLETED" | "ARCHIVED" | "PLANNING";

export interface ProjectMemberDto {
  id?: string;
  projectId?: string;
  userId: string;
  userName: string | null;
  userEmail?: string | null;
  userPhone: string | null;
  role: string;
  status?: string;
  joinedAt?: string;
  createdAt?: string;
}

export interface ProjectResponseDto {
  id: string;
  ownerId: string;
  myRole?: "OWNER" | "PRO" | "CLIENT_VIEWER" | null;
  name: string;
  address: string | null;
  expectedDeliveryAt: string | null;
  budgetCents: number | null;
  hoursContracted: number;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  trackFinancial?: boolean;
  trackActivities?: boolean;
  members?: ProjectMemberDto[];
}

export interface ProjectSummaryDto extends ProjectResponseDto {
  /** @deprecated Use os campos de etapas/atividades; representam atividades agora. */
  taskCount: number;
  /** @deprecated Use os campos de etapas/atividades. */
  completedTaskCount: number;
  totalExpenseCents: number;
  // Novo modelo Obra → Etapas → Atividades
  totalStages?: number;
  totalActivities?: number;
  completedActivities?: number;
  /** Razão 0..1 ou null quando a obra não tem atividades. */
  progress?: number | null;
}

export interface ProjectProgressDto {
  totalStages: number;
  totalActivities: number;
  completedActivities: number;
  /** Razão 0..1 ou null quando a obra não tem atividades. */
  progress: number | null;
  nextPendingActivities: ActivityResponseDto[];
}

export interface UpdateProjectDto {
  name?: string;
  address?: string | null;
  expectedDeliveryAt?: string | null;
  budgetCents?: number | null;
  hoursContracted?: number;
  status?: ProjectStatus;
  trackFinancial?: boolean;
  trackActivities?: boolean;
}

export const projectsService = {
  listMine: () => api.get<ProjectResponseDto[]>("/projects/mine"),

  listMineSummary: () =>
    api.get<ProjectSummaryDto[]>("/projects/mine/summary"),

  getById: (id: string) => api.get<ProjectResponseDto>(`/projects/${id}`),

  getProgress: (id: string) =>
    api.get<ProjectProgressDto>(`/projects/${id}/progress`),

  update: (id: string, dto: UpdateProjectDto) =>
    api.patch<ProjectResponseDto>(`/projects/${id}`, dto),
};
