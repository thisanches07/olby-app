import { api } from "./api";

/**
 * Resposta da verificação de status de subscrição.
 * Vem do endpoint GET /users/me/subscription-status.
 */
export interface SubscriptionStatusResponse {
  hasActiveSubscription: boolean;
  provider?: string; // "APPLE" | "GOOGLE" | "STRIPE"
  currentPeriodEnd?: string; // ISO 8601 date string
}

/**
 * Verifica se o usuário tem uma subscrição ativa.
 *
 * @returns SubscriptionStatusResponse com hasActiveSubscription e detalhes de período
 * @throws ApiError com status HTTP acessível para tratamento granular
 */
export async function checkSubscriptionStatus(): Promise<SubscriptionStatusResponse> {
  return api.get<SubscriptionStatusResponse>("/users/me/subscription-status");
}

/**
 * Deleta a conta do usuário no backend.
 * Retorna 204 No Content em caso de sucesso (sem body).
 *
 * PRECONDIÇÃO:
 *   - Logout do Firebase deve ser feito ANTES desta chamada
 *   - Token local deve ser limpo ANTES desta chamada
 *
 * @throws ApiError com status 403 se a conta tem subscrição ativa
 *       ApiError com outros status para erros inesperados
 */
export async function deleteAccount(): Promise<void> {
  // api.delete retorna null para 204 No Content
  await api.delete<void>("/users/me");
}
