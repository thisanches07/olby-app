export type PlanCode = "FREE" | "BASIC" | "PRO";
export type SubscriptionStatus =
  | "TRIAL"
  | "ACTIVE"
  | "GRACE"
  | "CANCELED"
  | "EXPIRED"
  | "PAST_DUE"
  | null;

export interface EffectivePlanResponse {
  code: PlanCode;
  name: string;
  projectLimit: number;
  priceCents: number;
  subscriptionStatus: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  accessUntil?: string | null;
  cancelAtPeriodEnd?: boolean;
  willRenew?: boolean;
  isCanceled?: boolean;
  canceledAt?: string | null;
}

export interface MySubscriptionResponse {
  code: PlanCode;
  name: string;
  projectLimit: number;
  priceCents: number;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  accessUntil: string | null;
  cancelAtPeriodEnd: boolean;
  willRenew: boolean;
  isCanceled: boolean;
  canceledAt: string | null;
  ownedProjectCount: number;
  canCreateProject: boolean;
}

export interface SubscriptionSnapshot {
  ownedProjectCount: number;
  canCreateProject: boolean;
}

export type BillingErrorCode =
  | "INVALID_PURCHASE"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "TRANSIENT"
  | "UNKNOWN";

export class BillingApiError extends Error {
  constructor(
    message: string,
    public readonly status: number | null,
    public readonly code: BillingErrorCode,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = "BillingApiError";
  }
}

function getStatus(error: unknown): number | null {
  if (typeof error === "object" && error && "status" in error) {
    const status = (error as { status?: unknown }).status;
    if (typeof status === "number") return status;
  }
  return null;
}

export function mapBillingError(error: unknown): BillingApiError {
  if (error instanceof BillingApiError) return error;

  const status = getStatus(error);

  if (status === 400) {
    return new BillingApiError(
      "Compra inválida ou produto não mapeado.",
      400,
      "INVALID_PURCHASE",
      false,
    );
  }
  if (status === 401) {
    return new BillingApiError(
      "Sessão expirada. Faça login novamente.",
      401,
      "UNAUTHORIZED",
      false,
    );
  }
  if (status === 404) {
    return new BillingApiError(
      "Usuário ou plano não encontrado.",
      404,
      "NOT_FOUND",
      false,
    );
  }
  if (status === 429) {
    return new BillingApiError(
      "Muitas tentativas. Aguarde e tente novamente.",
      429,
      "RATE_LIMITED",
      false,
    );
  }
  if (status !== null && status >= 500 && status <= 599) {
    return new BillingApiError(
      "Erro temporario no servidor. Tente novamente.",
      status,
      "TRANSIENT",
      true,
    );
  }

  return new BillingApiError(
    "Falha inesperada ao processar assinatura.",
    status,
    "UNKNOWN",
    false,
  );
}

export function mapEffectivePlanToSubscription(
  effectivePlan: EffectivePlanResponse,
  snapshot: SubscriptionSnapshot,
): MySubscriptionResponse {
  const status = effectivePlan.subscriptionStatus;
  const normalizedStatus: SubscriptionStatus =
    status === "TRIAL" ||
    status === "ACTIVE" ||
    status === "GRACE" ||
    status === "CANCELED" ||
    status === "EXPIRED" ||
    status === "PAST_DUE" ||
    status === null
      ? status
      : null;

  return {
    code: effectivePlan.code,
    name: effectivePlan.name,
    projectLimit: effectivePlan.projectLimit,
    priceCents: effectivePlan.priceCents,
    subscriptionStatus: normalizedStatus,
    trialEndsAt: effectivePlan.trialEndsAt,
    currentPeriodEnd: effectivePlan.currentPeriodEnd,
    accessUntil: effectivePlan.accessUntil ?? effectivePlan.currentPeriodEnd,
    cancelAtPeriodEnd: effectivePlan.cancelAtPeriodEnd ?? false,
    willRenew: effectivePlan.willRenew ?? !effectivePlan.isCanceled,
    isCanceled: effectivePlan.isCanceled ?? false,
    canceledAt: effectivePlan.canceledAt ?? null,
    ownedProjectCount: snapshot.ownedProjectCount,
    canCreateProject: snapshot.canCreateProject,
  };
}
