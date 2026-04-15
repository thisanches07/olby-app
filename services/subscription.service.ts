import { billingApi } from "./billing.api";

export type PlanCode = "FREE" | "BASIC" | "PRO";
export type SubscriptionStatus =
  | "TRIAL"
  | "ACTIVE"
  | "GRACE"
  | "PAST_DUE"
  | "CANCELED"
  | "EXPIRED"
  | null;

export interface SubscriptionInfo {
  code: PlanCode;
  name: string;
  /** Máximo de obras como OWNER. -1 = ilimitado */
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

export function buildFreeSubscriptionInfo(): SubscriptionInfo {
  return {
    code: "FREE",
    name: "Gratuito",
    projectLimit: 0,
    priceCents: 0,
    subscriptionStatus: null,
    trialEndsAt: null,
    currentPeriodEnd: null,
    accessUntil: null,
    cancelAtPeriodEnd: false,
    willRenew: false,
    isCanceled: false,
    canceledAt: null,
    ownedProjectCount: 0,
    canCreateProject: false,
  };
}

export const subscriptionService = {
  getMyPlan: (): Promise<SubscriptionInfo> => billingApi.getMySubscription(),
};

export function hasSubscriptionEntitlement(
  status: SubscriptionStatus,
): boolean {
  return (
    status === "TRIAL" ||
    status === "ACTIVE" ||
    status === "GRACE" ||
    status === "CANCELED"
  );
}

export function formatSubscriptionDate(
  value: string | null | undefined,
  options?: { verbose?: boolean },
): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  if (options?.verbose) {
    return date.toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function hasCanceledAccess(
  subscription:
    | Pick<SubscriptionInfo, "isCanceled" | "accessUntil">
    | null
    | undefined,
): boolean {
  return Boolean(subscription?.isCanceled && subscription?.accessUntil);
}

export function getSubscriptionStatusMessage(params: {
  status: SubscriptionStatus;
  currentPeriodEnd?: string | null;
  trialEndsAt?: string | null;
  accessUntil?: string | null;
  isCanceled?: boolean;
}): string | null {
  const { status, isCanceled } = params;

  if (isCanceled) {
    return null;
  }

  switch (status) {
    case "ACTIVE":
      return null;
    case "GRACE":
      return "Identificamos um problema na renovação, mas seu acesso segue ativo temporariamente.";
    case "CANCELED":
      return "A renovação automática foi desativada para este plano.";
    case "TRIAL":
      return "Você está em período de teste.";
    case "PAST_DUE":
      return "Sua assinatura não está mais ativa por falha de cobrança. Atualize o pagamento para recuperar o acesso.";
    case "EXPIRED":
      return "Sua assinatura expirou.";
    case null:
      return "Sem assinatura ativa.";
  }
}

export function getStatusBadge(params: {
  status: SubscriptionStatus;
  isCanceled?: boolean;
}): {
  label: string;
  color: string;
} {
  if (params.isCanceled) {
    return { label: "Cancelada ao fim do ciclo", color: "#B45309" };
  }

  switch (params.status) {
    case "TRIAL":
      return { label: "Trial ativo", color: "#2563EB" };
    case "ACTIVE":
      return { label: "Assinatura ativa", color: "#16A34A" };
    case "GRACE":
      return { label: "Renovação com problema", color: "#D97706" };
    case "PAST_DUE":
      return { label: "Sem acesso por cobrança", color: "#DC2626" };
    case "CANCELED":
      return { label: "Cancelada com acesso", color: "#6B7280" };
    case "EXPIRED":
      return { label: "Expirado", color: "#6B7280" };
    case null:
      return { label: "Sem assinatura", color: "#6B7280" };
  }
}

export function formatPrice(cents: number): string {
  if (cents === 0) return "Grátis";
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}/mês`;
}
