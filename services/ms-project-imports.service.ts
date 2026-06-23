import { ApiError, BASE_URL } from "./api";
import { getIdToken } from "./token";

export type MsProjectImportInferredStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "DONE";

export type MsProjectImportWarningCode =
  | "NAME_TRUNCATED"
  | "MISSING_START_DATE"
  | "MISSING_FINISH_DATE"
  | "ORPHAN_ACTIVITIES_MERGED_INTO_DEFAULT_STAGE"
  | "DEEP_HIERARCHY_FLATTENED"
  | "MILESTONE_IGNORED"
  | "EMPTY_STAGE"
  | "LEAFS_AT_STAGE_LEVEL_ATTACHED_TO_PREVIOUS_STAGE"
  | "STAGE_LEVEL_AUTO_DETECTED"
  | "DATES_TREATED_AS_UTC"
  | "PROJECT_FILE_HAS_NO_TASKS";

export type MsProjectImportPreviewStageSource = "SUMMARY" | "DEFAULT";

export interface MsProjectImportPreviewActivity {
  uid: number;
  name: string;
  nameWasTruncated: boolean;
  originalName?: string;
  description: string | null;
  startDate: string | null;
  dueDate: string | null;
  inferredStatus: MsProjectImportInferredStatus;
  percentComplete: number | null;
  outlineNumber: string;
  position: number;
}

export interface MsProjectImportPreviewStage {
  uid: number | null;
  name: string;
  nameWasTruncated: boolean;
  originalName?: string;
  description: string | null;
  outlineNumber: string | null;
  position: number;
  source: MsProjectImportPreviewStageSource;
  activities: MsProjectImportPreviewActivity[];
}

export interface MsProjectImportPreviewWarning {
  code: MsProjectImportWarningCode | string;
  message: string;
  affectedCount?: number;
  examples?: string[];
}

export interface MsProjectImportPreview {
  summary: {
    stagesCount: number;
    activitiesCount: number;
    orphanActivitiesMerged: number;
  };
  stages: MsProjectImportPreviewStage[];
  warnings: MsProjectImportPreviewWarning[];
  projectMeta: {
    title: string | null;
    author: string | null;
    mspExportDate: string | null;
    stageLevel: number | null;
    summariesByLevel: Record<number, number>;
  };
}

export interface PickedXmlFile {
  uri: string;
  name: string;
  mimeType?: string | null;
}

function extractEnvelope(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const error = (body as { error?: unknown }).error;
  return error && typeof error === "object"
    ? (error as Record<string, unknown>)
    : null;
}

function extractMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const candidate = body as { message?: unknown; error?: unknown };
  if (typeof candidate.message === "string" && candidate.message.trim()) {
    return candidate.message;
  }
  if (typeof candidate.error === "string" && candidate.error.trim()) {
    return candidate.error;
  }
  const envelope = extractEnvelope(body);
  const nested = envelope?.message;
  return typeof nested === "string" && nested.trim() ? nested : null;
}

export function isMsProjectImportRequiresProError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status === 403 &&
    error.code === "MS_PROJECT_IMPORT_REQUIRES_PRO"
  );
}

export async function previewMsProjectImport(
  projectId: string,
  file: PickedXmlFile,
): Promise<MsProjectImportPreview> {
  const token = await getIdToken();
  const form = new FormData();
  form.append("file", {
    uri: file.uri,
    name: file.name || "ms-project.xml",
    type: file.mimeType || "application/xml",
  } as unknown as Blob);

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(
    `${BASE_URL}/projects/${projectId}/imports/ms-project/preview`,
    { method: "POST", body: form, headers },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const envelope = extractEnvelope(body);
    const code =
      typeof envelope?.code === "string" ? envelope.code : undefined;
    const message =
      extractMessage(body) ?? `Erro ${response.status}: ${response.statusText}`;

    throw new ApiError(
      message,
      response.status,
      code,
      envelope ?? undefined,
    );
  }

  return (await response.json()) as MsProjectImportPreview;
}
