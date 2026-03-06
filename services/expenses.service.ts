import { api } from "./api";

export type ExpenseCategory = string; // 'material' | 'labor' | 'service' | 'other'

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
}

export interface CreateExpenseDto {
  projectId: string;
  taskId?: string | null;
  category: ExpenseCategory;
  description?: string;
  amountCents: number;
  date: string; // YYYY-MM-DD
}

export interface UpdateExpenseDto {
  taskId?: string | null;
  category?: ExpenseCategory;
  description?: string | null;
  amountCents?: number;
  date?: string;
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
