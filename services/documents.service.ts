import type {
  DocumentAttachment,
  DocumentKind,
  DocumentSource,
} from "@/data/obras";
import { api } from "./api";

export interface PresignDocumentDto {
  originalFileName: string;
  contentType: string;
  sizeBytes: number;
  kind: DocumentKind;
  source: DocumentSource;
  expenseId?: string;
}

export interface PresignDocumentResponseDto {
  documentId: string;
  uploadUrl: string;
  storageKey: string;
  expiresInSeconds: number;
}

export type DocumentWithViewUrl = DocumentAttachment & { viewUrl?: string };

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

  listByExpense: (projectId: string, expenseId: string) =>
    api.get<DocumentAttachment[]>(
      `/projects/${encodeURIComponent(projectId)}/documents?expenseId=${encodeURIComponent(expenseId)}`,
    ),

  getById: (projectId: string, documentId: string) =>
    api.get<DocumentWithViewUrl>(
      `/projects/${encodeURIComponent(projectId)}/documents/${documentId}`,
    ),

  remove: (projectId: string, documentId: string) =>
    api.delete<void>(
      `/projects/${encodeURIComponent(projectId)}/documents/${documentId}`,
    ),
};
