/**
 * Source of truth dos eventos rastreados no PostHog.
 *
 * Convenções:
 * - Nome do evento em snake_case (padrão PostHog).
 * - Propriedades também em snake_case.
 * - IDs (project_id, entry_id...) entram como propriedade — NUNCA no nome do
 *   evento, para evitar explosão de cardinalidade.
 * - Valores monetários sempre em centavos (mantém consistência com o backend).
 */

export const AnalyticsEvents = {
  // Auth / Onboarding
  SIGNUP_COMPLETED: "signup_completed",
  LOGIN_COMPLETED: "login_completed",
  ROLE_SELECTED: "role_selected",

  // Core (criação de conteúdo)
  PROJECT_CREATED: "project_created",
  TASK_CREATED: "task_created",
  TASK_COMPLETED: "task_completed",
  DAILY_LOG_ENTRY_CREATED: "daily_log_entry_created",
  PHOTO_UPLOADED: "photo_uploaded",
  QUOTE_CREATED: "quote_created",
  EXPENSE_CREATED: "expense_created",

  // Compartilhamento / convite
  PROJECT_SHARE_LINK_GENERATED: "project_share_link_generated",
  INVITE_ACCEPTED: "invite_accepted",

  // Funil de assinatura (IAP)
  PAYWALL_VIEWED: "paywall_viewed",
  IAP_PURCHASE_STARTED: "iap_purchase_started",
  IAP_PURCHASE_VERIFIED: "iap_purchase_verified",
  IAP_PURCHASE_FAILED: "iap_purchase_failed",
} as const;

export type AnalyticsEvent = (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];

export type AuthMethod = "email" | "google" | "apple";
/** Mantém alinhado com `OnboardingRole` em utils/onboarding.storage.ts. */
export type UserRole = "manager" | "viewer";
export type IapPlatform = "ios" | "android";
export type IapFailureStage = "request" | "verify";

export type EventProps = {
  [AnalyticsEvents.SIGNUP_COMPLETED]: { method: AuthMethod };
  [AnalyticsEvents.LOGIN_COMPLETED]: { method: AuthMethod };
  [AnalyticsEvents.ROLE_SELECTED]: { role: UserRole };

  [AnalyticsEvents.PROJECT_CREATED]: { project_id: string };
  [AnalyticsEvents.TASK_CREATED]: { project_id: string; task_id: string };
  [AnalyticsEvents.TASK_COMPLETED]: { project_id: string; task_id: string };
  [AnalyticsEvents.DAILY_LOG_ENTRY_CREATED]: {
    project_id: string;
    entry_id: string;
    photo_count: number;
  };
  [AnalyticsEvents.PHOTO_UPLOADED]: { project_id: string; entry_id: string };
  [AnalyticsEvents.QUOTE_CREATED]: { project_id: string; quote_id: string };
  [AnalyticsEvents.EXPENSE_CREATED]: {
    project_id: string;
    expense_id: string;
    amount_cents: number;
  };

  [AnalyticsEvents.PROJECT_SHARE_LINK_GENERATED]: { project_id: string };
  [AnalyticsEvents.INVITE_ACCEPTED]: { project_id?: string };

  [AnalyticsEvents.PAYWALL_VIEWED]: { source?: string };
  [AnalyticsEvents.IAP_PURCHASE_STARTED]: {
    sku: string;
    platform: IapPlatform;
  };
  [AnalyticsEvents.IAP_PURCHASE_VERIFIED]: {
    sku?: string;
    effective_plan: string;
  };
  [AnalyticsEvents.IAP_PURCHASE_FAILED]: {
    sku?: string;
    stage: IapFailureStage;
    error_message: string;
  };
};
