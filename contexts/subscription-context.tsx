import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

import { forceRefreshIdToken } from "@/services/token";

const TAG = "[SUB]";
function subLog(event: string, data?: unknown): void {
  if (__DEV__) {
    if (data !== undefined) {
      console.log(`${TAG} ${event}`, JSON.stringify(data, null, 2));
    } else {
      console.log(`${TAG} ${event}`);
    }
  }
}

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
  const inFlightPurchases = useRef<Map<string, Promise<void>>>(new Map());

  const refresh = useCallback(
    async (options?: { retryOnUnauthorized?: boolean }) => {
      const retryOnUnauthorized = options?.retryOnUnauthorized === true;

      try {
        setIsLoading(true);
        setError(null);
        const data = await subscriptionService.getMyPlan();
        setPlan(data);
      } catch (err: unknown) {
        const mapped = mapBillingError(err);

        if (
          retryOnUnauthorized &&
          (mapped.status === 401 || mapped.code === "UNAUTHORIZED")
        ) {
          subLog(
            "refresh → 401 after purchase, force-refreshing token and retrying once",
          );
          try {
            await forceRefreshIdToken();
            const data = await subscriptionService.getMyPlan();
            setPlan(data);
            subLog("refresh → retry after token refresh succeeded");
            return;
          } catch (retryError: unknown) {
            const retryMapped = mapBillingError(retryError);
            subLog("refresh → retry after token refresh failed", {
              status: retryMapped.status,
              code: retryMapped.code,
              message: retryMapped.message,
            });
            setError(getFriendlySubscriptionError(retryMapped));
            return;
          }
        }

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
    },
    [],
  );

  const clearPurchaseFeedback = useCallback(() => {
    setPurchaseError(null);
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
        subLog("verifyApplePurchase → POST /billing/mobile/verify", {
          provider: "APPLE",
          transactionId: trimmed,
          appleSandbox,
        });
        try {
          const result = await billingApi.verifyApplePurchase(
            trimmed,
            appleSandbox,
          );
          subLog("verifyApplePurchase → response", {
            idempotent: result.idempotent,
            eventId: result.eventId,
            effectivePlan: result.effectivePlan,
          });
          subLog("verifyApplePurchase → force-refreshing Firebase token");
          await forceRefreshIdToken().catch((e: unknown) => {
            subLog("verifyApplePurchase → token refresh failed", {
              message: e instanceof Error ? e.message : String(e),
            });
          });
          setPlan((prev) =>
            mapEffectivePlanToSubscription(result.effectivePlan, {
              ownedProjectCount: prev?.ownedProjectCount ?? 0,
              canCreateProject: prev?.canCreateProject ?? true,
            }),
          );
          subLog("verifyApplePurchase → calling refresh()");
          await refresh({ retryOnUnauthorized: true });
          subLog("verifyApplePurchase → refresh() done");
        } catch (error: unknown) {
          subLog("verifyApplePurchase → error", {
            name: error instanceof Error ? error.name : typeof error,
            message: error instanceof Error ? error.message : String(error),
          });
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
        subLog("verifyGooglePurchase → POST /billing/mobile/verify", {
          provider: "GOOGLE",
          purchaseToken: `${trimmed.slice(0, 20)}…`,
        });
        try {
          const result = await billingApi.verifyGooglePurchase(trimmed);
          subLog("verifyGooglePurchase → response", {
            idempotent: result.idempotent,
            eventId: result.eventId,
            effectivePlan: result.effectivePlan,
          });
          subLog("verifyGooglePurchase → force-refreshing Firebase token");
          await forceRefreshIdToken().catch((e: unknown) => {
            subLog("verifyGooglePurchase → token refresh failed", {
              message: e instanceof Error ? e.message : String(e),
            });
          });
          setPlan((prev) =>
            mapEffectivePlanToSubscription(result.effectivePlan, {
              ownedProjectCount: prev?.ownedProjectCount ?? 0,
              canCreateProject: prev?.canCreateProject ?? true,
            }),
          );
          subLog("verifyGooglePurchase → calling refresh()");
          await refresh({ retryOnUnauthorized: true });
          subLog("verifyGooglePurchase → refresh() done");
        } catch (error: unknown) {
          subLog("verifyGooglePurchase → error", {
            name: error instanceof Error ? error.name : typeof error,
            message: error instanceof Error ? error.message : String(error),
          });
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
