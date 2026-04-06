import type { DocumentSource } from "@/data/obras";
import { api } from "./api";

export type ExpenseCategory = string; // 'material' | 'labor' | 'service' | 'other'

export interface InlineReceiptDocumentDto {
  originalFileName: string;
  contentType: string;
  sizeBytes: number;
  kind: "RECEIPT";
  source: DocumentSource;
}

export interface InlineReceiptDocumentResponseDto {
  id: string;
  /** Only present when status === 'PENDING_UPLOAD' (immediate POST response). */
  uploadUrl?: string;
  /** Only present when status === 'READY'. */
  viewUrl?: string;
  status: "PENDING_UPLOAD" | "READY" | "FAILED";
  originalFileName: string;
  contentType: string;
  sizeBytes: number;
  kind: string;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseResponseDto {
  id: string;
  projectId: string;
  taskId: string | null;
  category: ExpenseCategory;
  description: string | null;
  amountCents: number;
  date: string; // YYYY-MM-DD
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  receiptDocumentId?: string | null;
  receiptUrl?: string | null;
  receiptDocument?: InlineReceiptDocumentResponseDto | null;
}

export interface CreateExpenseDto {
  projectId: string;
  taskId?: string | null;
  category: ExpenseCategory;
  description?: string;
  amountCents: number;
  date: string; // YYYY-MM-DD
  /** Use for linking an already-confirmed document (edit flow). Mutually exclusive with receiptDocument. */
  receiptDocumentId?: string | null;
  /** Use for inline creation (new expense flow). Mutually exclusive with receiptDocumentId. */
  receiptDocument?: InlineReceiptDocumentDto;
}

export interface UpdateExpenseDto {
  taskId?: string | null;
  category?: ExpenseCategory;
  description?: string | null;
  amountCents?: number;
  date?: string;
  receiptDocumentId?: string | null;
}

export const expensesService = {
  listByProject: (projectId: string) =>
    api.get<ExpenseResponseDto[]>(
      `/expenses?projectId=${encodeURIComponent(projectId)}`,
    ),

  getById: (id: string) => api.get<ExpenseResponseDto>(`/expenses/${id}`),

  create: (dto: CreateExpenseDto) =>
    api.post<ExpenseResponseDto>("/expenses", dto),

  update: (id: string, dto: UpdateExpenseDto) =>
    api.patch<ExpenseResponseDto>(`/expenses/${id}`, dto),

  delete: (id: string) => api.delete<void>(`/expenses/${id}`),

  deleteByProject: (projectId: string) =>
    api.delete<void>(
      `/expenses/by-project?projectId=${encodeURIComponent(projectId)}`,
    ),
};
