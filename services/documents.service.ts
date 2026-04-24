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

export interface DocumentsPageInfoDto {
  limit: number;
  returnedCount: number;
  hasMore: boolean;
  nextCursor: string | null;
  offset: number | null;
}

export interface ListDocumentsResponseDto {
  items: DocumentAttachment[];
  pageInfo: DocumentsPageInfoDto;
}

export interface ListProjectDocumentsParams {
  expenseId?: string;
  kind?: DocumentKind;
  visibility?: DocumentVisibility;
  pinned?: boolean;
  name?: string;
  status?: DocumentAttachment["status"];
  limit?: number;
  cursor?: string;
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
  if (params.name) searchParams.set("name", params.name);
  if (params.status) searchParams.set("status", params.status);
  if (typeof params.limit === "number") {
    searchParams.set("limit", String(params.limit));
  }
  if (params.cursor) searchParams.set("cursor", params.cursor);

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

function extractDocumentItems(
  response: DocumentAttachment[] | ListDocumentsResponseDto,
): DocumentAttachment[] {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  return [];
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

  listPage: async (projectId: string, params?: ListProjectDocumentsParams) => {
    const response = await api.get<
      DocumentAttachment[] | ListDocumentsResponseDto
    >(
      `/projects/${encodeURIComponent(projectId)}/documents${buildQuery(params)}`,
    );
    if (Array.isArray(response)) {
      return {
        items: response,
        pageInfo: {
          limit: params?.limit ?? response.length,
          returnedCount: response.length,
          hasMore: false,
          nextCursor: null,
          offset: null,
        } satisfies DocumentsPageInfoDto,
      };
    }
    return {
      items: extractDocumentItems(response),
      pageInfo: response?.pageInfo ?? {
        limit: params?.limit ?? 20,
        returnedCount: extractDocumentItems(response).length,
        hasMore: false,
        nextCursor: null,
        offset: null,
      },
    };
  },

  list: async (projectId: string, params?: ListProjectDocumentsParams) => {
    const response = await documentsService.listPage(projectId, params);
    return response.items;
  },

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
