import { api } from "./api";
import { track } from "./analytics";
import { AnalyticsEvents } from "@/types/analytics-events";

export type ActivityStatus = "PENDING" | "IN_PROGRESS" | "DONE";

export interface ActivityResponseDto {
  id: string;
  stageId: string;
  projectId: string;
  name: string;
  description: string | null;
  status: ActivityStatus;
  position: number;
  startDate: string | null;
  dueDate: string | null;
  assignedUserId: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateActivityDto {
  name: string;
  description?: string;
  status?: ActivityStatus;
  position?: number;
  startDate?: string | null;
  dueDate?: string | null;
  assignedUserId?: string | null;
}

export interface UpdateActivityDto {
  name?: string;
  description?: string | null;
  status?: ActivityStatus;
  position?: number;
  startDate?: string | null;
  dueDate?: string | null;
  assignedUserId?: string | null;
}

export const activitiesService = {
  listByStage: (stageId: string) =>
    api.get<ActivityResponseDto[]>(`/stages/${stageId}/activities`),

  getById: (id: string) => api.get<ActivityResponseDto>(`/activities/${id}`),

  create: (stageId: string, dto: CreateActivityDto) =>
    api
      .post<ActivityResponseDto>(`/stages/${stageId}/activities`, dto)
      .then((activity) => {
        track(AnalyticsEvents.ACTIVITY_CREATED, {
          project_id: activity.projectId,
          stage_id: activity.stageId,
          activity_id: activity.id,
        });
        return activity;
      }),

  update: (id: string, dto: UpdateActivityDto) =>
    api.patch<ActivityResponseDto>(`/activities/${id}`, dto),

  updateStatus: (id: string, status: ActivityStatus) =>
    api
      .patch<ActivityResponseDto>(`/activities/${id}/status`, { status })
      .then((activity) => {
        if (status === "DONE") {
          track(AnalyticsEvents.ACTIVITY_COMPLETED, {
            project_id: activity.projectId,
            stage_id: activity.stageId,
            activity_id: activity.id,
          });
        }
        return activity;
      }),

  delete: (id: string) => api.delete<void>(`/activities/${id}`),
};
