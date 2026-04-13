import { api } from "./api";

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
  taskCount: number;
  completedTaskCount: number;
  totalExpenseCents: number;
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

  update: (id: string, dto: UpdateProjectDto) =>
    api.patch<ProjectResponseDto>(`/projects/${id}`, dto),
};
