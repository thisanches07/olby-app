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
  date: string; // "YYYY-MM-DD"
  arrivedAt: string | null; // ISO 8601 timestamptz
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
  date: string; // "YYYY-MM-DD"
  arrivedAt?: string | null; // ISO 8601 timestamptz
  durationMinutes: number; // required, min 30, multiple of 30
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

export interface DailyLogEntryFeedPhotoPreviewDto {
  id: string;
  thumbUrl: string;
  thumbContentType: string;
  thumbSizeBytes: string;
  createdAt: string;
}

export interface DailyLogEntryFeedItemDto {
  id: string;
  projectId: string;
  date: string;
  arrivedAt: string | null;
  createdAt: string;
  title: string | null;
  notes: string | null;
  durationMinutes: number | null;
  photoCount: number;
  photosPreview: DailyLogEntryFeedPhotoPreviewDto[];
}

export interface DailyLogEntriesFeedPageInfoDto {
  limit: number;
  returnedCount: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface ListDailyLogEntriesFeedResponseDto {
  items: DailyLogEntryFeedItemDto[];
  pageInfo: DailyLogEntriesFeedPageInfoDto;
}

export const dailyLogEntriesService = {
  listByProject: (projectId: string, dateFrom?: string, dateTo?: string) => {
    let path = `/daily-log-entries?projectId=${encodeURIComponent(projectId)}`;
    if (dateFrom) path += `&dateFrom=${encodeURIComponent(dateFrom)}`;
    if (dateTo) path += `&dateTo=${encodeURIComponent(dateTo)}`;
    return api.get<DailyLogEntryResponseDto[]>(path);
  },

  listFeedByProject: (projectId: string, cursor?: string, limit = 10) => {
    let path = `/v1/daily-log-entries/feed?projectId=${encodeURIComponent(projectId)}&limit=${Math.min(
      Math.max(limit, 1),
      10,
    )}`;
    if (cursor) path += `&cursor=${encodeURIComponent(cursor)}`;
    return api.get<ListDailyLogEntriesFeedResponseDto>(path);
  },

  create: (dto: CreateDailyLogEntryDto) =>
    api.post<DailyLogEntryResponseDto>("/daily-log-entries", dto),

  getById: (id: string) =>
    api.get<DailyLogEntryResponseDto>(`/daily-log-entries/${id}`),

  update: (id: string, dto: UpdateDailyLogEntryDto) =>
    api.patch<DailyLogEntryResponseDto>(`/daily-log-entries/${id}`, dto),

  remove: (id: string) => api.delete<void>(`/daily-log-entries/${id}`),
};
