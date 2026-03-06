import { api } from "./api";

export type PhotoStatus = "PENDING" | "READY" | "FAILED";

export interface DailyLogPhotoDto {
  id: string;
  entryId: string;
  projectId: string;
  status: PhotoStatus;
  thumbUrl?: string;           // present only when READY
  thumbContentType: string;
  thumbSizeBytes: string;
  createdAt: string;
}

export interface PresignDto {
  projectId: string;
  entryId: string;
  contentType: string;
  sizeBytes: number;
  thumbContentType: string;
  thumbSizeBytes: number;
}

export interface PresignResponseDto {
  photoId: string;
  uploadUrl: string;
  thumbUploadUrl: string;
  storageKey: string;
  thumbStorageKey: string;
  expiresInSeconds: number;
}

export interface ConfirmDto {
  projectId: string;
  photoId: string;
}

export const dailyLogPhotosService = {
  presign: (dto: PresignDto) =>
    api.post<PresignResponseDto>("/daily-log-photos/presign", dto),

  confirm: (dto: ConfirmDto) =>
    api.post<{ ok: boolean }>("/daily-log-photos/confirm", dto),

  listByEntry: (projectId: string, entryId: string) =>
    api.get<DailyLogPhotoDto[]>(
      `/daily-log-photos/by-entry?projectId=${encodeURIComponent(projectId)}&entryId=${encodeURIComponent(entryId)}`,
    ),

  getOriginalUrl: (photoId: string) =>
    api.get<{ url: string; expiresInSeconds: number }>(
      `/daily-log-photos/${photoId}/url`,
    ),

  getSignedUrlsForEntry: (projectId: string, entryId: string) =>
    api.get<Array<{ id: string; url: string; expiresInSeconds: number }>>(
      `/daily-log-photos/by-entry/signed-urls?projectId=${encodeURIComponent(projectId)}&entryId=${encodeURIComponent(entryId)}`,
    ),

  remove: (projectId: string, photoId: string) =>
    api.delete<void>(
      `/daily-log-photos/${photoId}?projectId=${encodeURIComponent(projectId)}`,
    ),
};
