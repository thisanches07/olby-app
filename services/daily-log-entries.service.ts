import { api } from "./api";

interface CreatePhotoDto {
  contentType: "image/jpeg" | "image/jpg" | "image/png" | "image/webp";
  sizeBytes: number;
  thumbContentType: "image/jpeg" | "image/jpg" | "image/png" | "image/webp";
  thumbSizeBytes: number;
}

export interface PhotoToUpload {
  photoId: string;
  uploadUrl: string;
  thumbUploadUrl: string;
  storageKey: string;
  thumbStorageKey: string;
  expiresInSeconds: number;
}

export interface DailyLogEntryResponseDto {
  id: string;
  projectId: string;
  date: string;               // "YYYY-MM-DD"
  arrivedAt: string | null;   // ISO 8601 timestamptz
  durationMinutes: number;
  title: string;
  notes: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  /** Present only when photos were sent in the POST body. */
  photosToUpload?: PhotoToUpload[];
}

export interface CreateDailyLogEntryDto {
  projectId: string;
  date: string;               // "YYYY-MM-DD"
  arrivedAt?: string | null;  // ISO 8601 timestamptz
  durationMinutes: number;    // required, min 30, multiple of 30
  title: string;
  notes?: string | null;
  photos?: CreatePhotoDto[];
}

export interface UpdateDailyLogEntryDto {
  date?: string;
  arrivedAt?: string | null;
  durationMinutes?: number;
  title?: string;
  notes?: string | null;
}

export const dailyLogEntriesService = {
  listByProject: (projectId: string, dateFrom?: string, dateTo?: string) => {
    let path = `/daily-log-entries?projectId=${encodeURIComponent(projectId)}`;
    if (dateFrom) path += `&dateFrom=${encodeURIComponent(dateFrom)}`;
    if (dateTo) path += `&dateTo=${encodeURIComponent(dateTo)}`;
    return api.get<DailyLogEntryResponseDto[]>(path);
  },

  create: (dto: CreateDailyLogEntryDto) =>
    api.post<DailyLogEntryResponseDto>("/daily-log-entries", dto),

  getById: (id: string) =>
    api.get<DailyLogEntryResponseDto>(`/daily-log-entries/${id}`),

  update: (id: string, dto: UpdateDailyLogEntryDto) =>
    api.patch<DailyLogEntryResponseDto>(`/daily-log-entries/${id}`, dto),

  remove: (id: string) => api.delete<void>(`/daily-log-entries/${id}`),
};
