import { api } from "./api";

export type TaskPriority = string; // 'high' | 'medium' | 'low'
export type TaskStatus = string; // 'pending' | 'in_progress' | 'done' | 'blocked'

export interface TaskResponseDto {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  position: number;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskDto {
  projectId: string;
  title: string;
  description?: string;
  priority: TaskPriority;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  position?: number;
}

export const tasksService = {
  listByProject: (projectId: string) =>
    api.get<TaskResponseDto[]>(
      `/tasks?projectId=${encodeURIComponent(projectId)}`,
    ),

  listOpenByProject: (projectId: string) =>
    api.get<TaskResponseDto[]>(
      `/tasks/open?projectId=${encodeURIComponent(projectId)}`,
    ),

  getById: (id: string) => api.get<TaskResponseDto>(`/tasks/${id}`),

  create: (dto: CreateTaskDto) => api.post<TaskResponseDto>("/tasks", dto),

  update: (id: string, dto: UpdateTaskDto) =>
    api.patch<TaskResponseDto>(`/tasks/${id}`, dto),

  delete: (id: string) => api.delete<void>(`/tasks/${id}`),

  deleteByProject: (projectId: string) =>
    api.delete<void>(
      `/tasks/by-project?projectId=${encodeURIComponent(projectId)}`,
    ),
};
