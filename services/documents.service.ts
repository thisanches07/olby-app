import type {
  DocumentAttachment,
  DocumentKind,
  DocumentSource,
  DocumentVisibility,
} from "@/data/obras";
import { api } from "./api";

export interface PresignDocumentDto {
  originalFileName: string;
  contentType: string;
  sizeBytes: number;
  kind: DocumentKind;
  source: DocumentSource;
  expenseId?: string;
  title?: string;
  visibility?: DocumentVisibility;
  isPinned?: boolean;
  linkedTaskId?: string;
  linkedDiaryEntryId?: string;
}

export interface PresignDocumentResponseDto {
  documentId: string;
  uploadUrl: string;
  storageKey: string;
  expiresInSeconds: number;
}

export interface DocumentAccessDto {
  viewUrl?: string;
  thumbnailUrl?: string | null;
}

export interface ListProjectDocumentsParams {
  expenseId?: string;
  kind?: DocumentKind;
  visibility?: DocumentVisibility;
  pinned?: boolean;
  search?: string;
  status?: DocumentAttachment["status"];
  limit?: number;
}

function buildQuery(params?: ListProjectDocumentsParams): string {
  if (!params) return "";

  const searchParams = new URLSearchParams();

  if (params.expenseId) searchParams.set("expenseId", params.expenseId);
  if (params.kind) searchParams.set("kind", params.kind);
  if (params.visibility) searchParams.set("visibility", params.visibility);
  if (typeof params.pinned === "boolean") {
    searchParams.set("pinned", String(params.pinned));
  }
  if (params.search) searchParams.set("search", params.search);
  if (params.status) searchParams.set("status", params.status);
  if (typeof params.limit === "number") {
    searchParams.set("limit", String(params.limit));
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export const documentsService = {
  presign: (projectId: string, dto: PresignDocumentDto) =>
    api.post<PresignDocumentResponseDto>(
      `/projects/${encodeURIComponent(projectId)}/documents/presign`,
      dto,
    ),

  confirm: (projectId: string, documentId: string) =>
    api.post<DocumentAttachment>(
      `/projects/${encodeURIComponent(projectId)}/documents/${documentId}/confirm`,
      {},
    ),

  list: (projectId: string, params?: ListProjectDocumentsParams) =>
    api.get<DocumentAttachment[]>(
      `/projects/${encodeURIComponent(projectId)}/documents${buildQuery(params)}`,
    ),

  listByExpense: (projectId: string, expenseId: string) =>
    documentsService.list(projectId, { expenseId }),

  getById: (projectId: string, documentId: string) =>
    api.get<DocumentAttachment>(
      `/projects/${encodeURIComponent(projectId)}/documents/${documentId}`,
    ),

  getAccess: (projectId: string, documentId: string) =>
    api.get<DocumentAccessDto>(
      `/projects/${encodeURIComponent(projectId)}/documents/${documentId}/access`,
    ),

  remove: (projectId: string, documentId: string) =>
    api.delete<void>(
      `/projects/${encodeURIComponent(projectId)}/documents/${documentId}`,
    ),
};
