import { api } from "./api";
import { track } from "./analytics";

export type QuoteGroupStatus = "OPEN" | "DECIDED";

export interface QuoteResponse {
  id: string;
  quoteGroupId: string;
  projectId: string;
  supplierName: string;
  supplierPhone: string | null;
  amountCents: number;
  notes: string | null;
  isChosen: boolean;
  isLowest: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteGroupResponse {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: QuoteGroupStatus;
  chosenQuoteId: string | null;
  generatedExpenseId: string | null;
  quotesCount: number;
  minAmountCents: number | null;
  maxAmountCents: number | null;
  chosenQuote: QuoteResponse | null;
  quotes: QuoteResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface SupplierSuggestion {
  supplierName: string;
  supplierPhone: string | null;
}

export interface CreateQuoteGroupInput {
  projectId: string;
  title: string;
  description?: string | null;
}

export interface UpdateQuoteGroupInput {
  title?: string;
  description?: string | null;
}

export interface CreateQuoteInput {
  quoteGroupId: string;
  supplierName: string;
  supplierPhone?: string | null;
  amountCents: number;
  notes?: string | null;
}

export type UpdateQuoteInput = Partial<Omit<CreateQuoteInput, "quoteGroupId">>;

export const quotesService = {
  listByProject: (projectId: string) =>
    api.get<QuoteGroupResponse[]>(
      `/quote-groups?projectId=${encodeURIComponent(projectId)}`,
    ),

  getGroup: (id: string) =>
    api.get<QuoteGroupResponse>(`/quote-groups/${id}`),

  createGroup: (input: CreateQuoteGroupInput) =>
    api.post<QuoteGroupResponse>("/quote-groups", input).then((group) => {
      track("quote_created", {
        project_id: group.projectId,
        quote_id: group.id,
      });
      return group;
    }),

  updateGroup: (id: string, input: UpdateQuoteGroupInput) =>
    api.patch<QuoteGroupResponse>(`/quote-groups/${id}`, input),

  deleteGroup: (id: string) =>
    api.delete<{ ok: true }>(`/quote-groups/${id}`),

  addQuote: (input: CreateQuoteInput) =>
    api.post<QuoteGroupResponse>("/quotes", input),

  updateQuote: (id: string, input: UpdateQuoteInput) =>
    api.patch<QuoteGroupResponse>(`/quotes/${id}`, input),

  deleteQuote: (id: string) =>
    api.delete<QuoteGroupResponse>(`/quotes/${id}`),

  choose: (groupId: string, quoteId: string) =>
    api.post<QuoteGroupResponse>(`/quote-groups/${groupId}/choose`, {
      quoteId,
    }),

  reopen: (groupId: string) =>
    api.post<QuoteGroupResponse>(`/quote-groups/${groupId}/reopen`, {}),

  supplierSuggestions: (projectId: string, q?: string) => {
    let path = `/quotes/supplier-suggestions?projectId=${encodeURIComponent(
      projectId,
    )}`;
    if (q && q.trim()) path += `&q=${encodeURIComponent(q.trim())}`;
    return api.post<SupplierSuggestion[]>(path, {});
  },
};
