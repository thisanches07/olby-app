import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  BillingApiError,
  billingApi,
  mapBillingError,
  mapEffectivePlanToSubscription,
} from "@/services/billing.api";
import type { SubscriptionInfo } from "@/services/subscription.service";
import {
  buildFreeSubscriptionInfo,
  subscriptionService,
} from "@/services/subscription.service";

interface SubscriptionState {
  plan: SubscriptionInfo | null;
  isLoading: boolean;
  isVerifyingPurchase: boolean;
  error: string | null;
  purchaseError: string | null;
  purchaseSuccess: string | null;
  refresh: () => Promise<void>;
  fetchBillingIdentity: () => Promise<{
    accountToken: string;
    appleAppAccountToken: string;
    googleObfuscatedAccountId: string;
  }>;
  clearPurchaseFeedback: () => void;
  verifyApplePurchase: (
    transactionId: string,
    appleSandbox?: boolean,
  ) => Promise<void>;
  verifyGooglePurchase: (purchaseToken: string) => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionState | null>(null);

export function getFriendlySubscriptionError(error: unknown): string {
  const mapped = mapBillingError(error);
  return mapped.message || "Não foi possivel carregar sua assinatura.";
}

export function SubscriptionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [plan, setPlan] = useState<SubscriptionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifyingPurchase, setIsVerifyingPurchase] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);
  const inFlightPurchases = useRef<Map<string, Promise<void>>>(new Map());

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await subscriptionService.getMyPlan();
      setPlan(data);
    } catch (err: unknown) {
      const mapped = mapBillingError(err);

      // 401 = sessão expirada — não sobrescreve o plano, deixa o AuthGate agir.
      if (mapped.status === 401 || mapped.code === "UNAUTHORIZED") {
        setError(getFriendlySubscriptionError(mapped));
        return;
      }

      // Para qualquer outro erro (404, 500, timeout, rede), fazemos fallback
      // para FREE para que o app mostre o modal de upgrade ao invés de
      // "Assinatura indisponível". Isso evita que cold-starts do servidor
      // bloqueiem completamente o fluxo do usuário.
      setPlan(buildFreeSubscriptionInfo());
      setError(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearPurchaseFeedback = useCallback(() => {
    setPurchaseError(null);
    setPurchaseSuccess(null);
  }, []);

  const fetchBillingIdentity = useCallback(async () => {
    return billingApi.getBillingIdentity();
  }, []);

  const verifyWithIdempotency = useCallback(
    async (key: string, operation: () => Promise<void>) => {
      const existing = inFlightPurchases.current.get(key);
      if (existing) return existing;

      const run = (async () => {
        try {
          setIsVerifyingPurchase(true);
          setPurchaseError(null);
          setPurchaseSuccess(null);
          await operation();
        } finally {
          inFlightPurchases.current.delete(key);
          setIsVerifyingPurchase(false);
        }
      })();

      inFlightPurchases.current.set(key, run);
      return run;
    },
    [],
  );

  const handleVerifyError = useCallback(async (error: unknown) => {
    const mapped: BillingApiError = mapBillingError(error);
    setPurchaseError(mapped.message);

    return mapped;
  }, []);

  const verifyApplePurchase = useCallback(
    async (transactionId: string, appleSandbox?: boolean) => {
      const trimmed = transactionId.trim();
      if (!trimmed) {
        setPurchaseError("Transacao Apple invalida.");
        return;
      }

      return verifyWithIdempotency(`APPLE:${trimmed}`, async () => {
        try {
          const result = await billingApi.verifyApplePurchase(
            trimmed,
            appleSandbox,
          );
          setPlan((prev) =>
            mapEffectivePlanToSubscription(result.effectivePlan, {
              ownedProjectCount: prev?.ownedProjectCount ?? 0,
              canCreateProject: prev?.canCreateProject ?? true,
            }),
          );
          await refresh();
          setPurchaseSuccess(
            result.idempotent
              ? "Compra ja processada anteriormente. Assinatura sincronizada."
              : "Assinatura atualizada com sucesso.",
          );
        } catch (error: unknown) {
          throw await handleVerifyError(error);
        }
      });
    },
    [handleVerifyError, refresh, verifyWithIdempotency],
  );

  const verifyGooglePurchase = useCallback(
    async (purchaseToken: string) => {
      const trimmed = purchaseToken.trim();
      if (!trimmed) {
        setPurchaseError("Purchase token Google invalido.");
        return;
      }

      return verifyWithIdempotency(`GOOGLE:${trimmed}`, async () => {
        try {
          const result = await billingApi.verifyGooglePurchase(trimmed);
          setPlan((prev) =>
            mapEffectivePlanToSubscription(result.effectivePlan, {
              ownedProjectCount: prev?.ownedProjectCount ?? 0,
              canCreateProject: prev?.canCreateProject ?? true,
            }),
          );
          await refresh();
          setPurchaseSuccess(
            result.idempotent
              ? "Compra ja processada anteriormente. Assinatura sincronizada."
              : "Assinatura atualizada com sucesso.",
          );
        } catch (error: unknown) {
          throw await handleVerifyError(error);
        }
      });
    },
    [handleVerifyError, refresh, verifyWithIdempotency],
  );

  const value = useMemo<SubscriptionState>(
    () => ({
      plan,
      isLoading,
      isVerifyingPurchase,
      error,
      purchaseError,
      purchaseSuccess,
      refresh,
      fetchBillingIdentity,
      clearPurchaseFeedback,
      verifyApplePurchase,
      verifyGooglePurchase,
    }),
    [
      plan,
      isLoading,
      isVerifyingPurchase,
      error,
      purchaseError,
      purchaseSuccess,
      refresh,
      fetchBillingIdentity,
      clearPurchaseFeedback,
      verifyApplePurchase,
      verifyGooglePurchase,
    ],
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionState {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error(
      "useSubscription must be used within a SubscriptionProvider",
    );
  }
  return ctx;
}
