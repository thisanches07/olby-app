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
  /** Maximo de obras como OWNER. -1 = ilimitado */
  projectLimit: number;
  priceCents: number;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
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
    ownedProjectCount: 0,
    canCreateProject: false,
  };
}

export const subscriptionService = {
  getMyPlan: (): Promise<SubscriptionInfo> =>
    billingApi.getMySubscription(),
};

export function getStatusBadge(status: SubscriptionStatus): {
  label: string;
  color: string;
} {
  switch (status) {
    case "TRIAL":
      return { label: "Em teste", color: "#2563EB" };
    case "ACTIVE":
      return { label: "Ativo", color: "#16A34A" };
    case "GRACE":
      return { label: "Em carencia", color: "#D97706" };
    case "PAST_DUE":
      return { label: "Pagamento falhou", color: "#DC2626" };
    case "CANCELED":
      return { label: "Cancelado", color: "#6B7280" };
    case "EXPIRED":
      return { label: "Expirado", color: "#6B7280" };
    case null:
      return { label: "Gratuito", color: "#6B7280" };
  }
}

export function formatPrice(cents: number): string {
  if (cents === 0) return "Gratis";
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}/mes`;
}
