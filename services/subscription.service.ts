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
  getMyPlan: (): Promise<SubscriptionInfo> => billingApi.getMySubscription(),
};

export function hasSubscriptionEntitlement(status: SubscriptionStatus): boolean {
  return (
    status === "TRIAL" ||
    status === "ACTIVE" ||
    status === "GRACE" ||
    status === "CANCELED"
  );
}

export function getSubscriptionStatusMessage(params: {
  status: SubscriptionStatus;
  currentPeriodEnd?: string | null;
  trialEndsAt?: string | null;
}): string | null {
  const { status, currentPeriodEnd, trialEndsAt } = params;

  const formatDate = (value: string | null | undefined) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  switch (status) {
    case "ACTIVE":
      return "Assinatura ativa.";
    case "GRACE": {
      const date = formatDate(currentPeriodEnd);
      return date
        ? `Houve um problema na renovação, mas seu acesso segue ativo temporariamente até ${date}.`
        : "Houve um problema na renovação, mas seu acesso segue ativo temporariamente.";
    }
    case "CANCELED": {
      const date = formatDate(currentPeriodEnd);
      return date
        ? `Renovação cancelada. Seu acesso continua até ${date}.`
        : "Renovação cancelada. Seu acesso continua até o fim do período atual.";
    }
    case "TRIAL": {
      const date = formatDate(trialEndsAt);
      return date
        ? `Período de teste ativo até ${date}.`
        : "Período de teste ativo.";
    }
    case "PAST_DUE":
      return "Sua assinatura não está mais ativa por falha de cobrança. Atualize o pagamento para recuperar o acesso.";
    case "EXPIRED":
      return "Sua assinatura expirou.";
    case null:
      return "Sem assinatura ativa.";
  }
}

export function getStatusBadge(status: SubscriptionStatus): {
  label: string;
  color: string;
} {
  switch (status) {
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
