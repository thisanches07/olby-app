import { api } from "./api";
import { track } from "./analytics";

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

  create: (dto: CreateTaskDto) =>
    api.post<TaskResponseDto>("/tasks", dto).then((task) => {
      track("task_created", { project_id: task.projectId, task_id: task.id });
      return task;
    }),

  update: (id: string, dto: UpdateTaskDto) =>
    api.patch<TaskResponseDto>(`/tasks/${id}`, dto).then((task) => {
      // Só dispara "task_completed" se o caller pediu DONE neste update.
      // (Comparar `task.status` no retorno cobriria refresh-only updates.)
      const normalized = (dto.status ?? "").toString().toLowerCase();
      if (normalized === "done" || normalized === "completed") {
        track("task_completed", {
          project_id: task.projectId,
          task_id: task.id,
        });
      }
      return task;
    }),

  delete: (id: string) => api.delete<void>(`/tasks/${id}`),

  deleteByProject: (projectId: string) =>
    api.delete<void>(
      `/tasks/by-project?projectId=${encodeURIComponent(projectId)}`,
    ),
};
