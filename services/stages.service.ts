import { api } from "./api";

export type StageStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
export type StagePriority = "HIGH" | "MEDIUM" | "LOW";

export interface StageResponseDto {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  status: StageStatus;
  priority: StagePriority | null;
  position: number;
  createdByUserId: string;
  totalActivities: number;
  completedActivities: number;
  /** Razão 0..1 ou null quando a etapa não tem atividades. */
  progress: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStageDto {
  name: string;
  description?: string;
  status?: StageStatus;
  priority?: StagePriority;
  position?: number;
}

export interface UpdateStageDto {
  name?: string;
  description?: string | null;
  status?: StageStatus;
  priority?: StagePriority | null;
  position?: number;
}

export const stagesService = {
  listByProject: (projectId: string) =>
    api.get<StageResponseDto[]>(`/projects/${projectId}/stages`),

  getById: (id: string) => api.get<StageResponseDto>(`/stages/${id}`),

  create: (projectId: string, dto: CreateStageDto) =>
    api.post<StageResponseDto>(`/projects/${projectId}/stages`, dto),

  update: (id: string, dto: UpdateStageDto) =>
    api.patch<StageResponseDto>(`/stages/${id}`, dto),

  delete: (id: string) => api.delete<void>(`/stages/${id}`),
};
