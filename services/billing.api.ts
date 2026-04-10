import { api } from "./api";
import {
  BillingApiError,
  mapBillingError,
} from "./billing.mappers";
import type { EffectivePlanResponse, MySubscriptionResponse } from "./billing.mappers";

export interface VerifyMobilePurchaseResponse {
  ok: true;
  idempotent: boolean;
  eventId: string;
  effectivePlan: EffectivePlanResponse;
}

export interface BillingIdentityResponse {
  accountToken: string;
  appleAppAccountToken: string;
  googleObfuscatedAccountId: string;
}

type VerifyApplePurchasePayload = {
  provider: "APPLE";
  appleTransactionId: string;
  appleSandbox: boolean;
};

type VerifyGooglePurchasePayload = {
  provider: "GOOGLE";
  googlePurchaseToken: string;
};

type SubscriptionsBillingMethod = "GET" | "POST";
type SubscriptionsBillingPath =
  | "/subscriptions/me"
  | "/billing/mobile/verify"
  | "/users/me/billing-identity";

const TIMEOUT_MS = 12000;
const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 400;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function timeoutError() {
  return new BillingApiError(
    "Tempo de resposta excedido. Tente novamente.",
    null,
    "TRANSIENT",
    true,
  );
}

/**
 * Função central para chamadas do domínio de subscriptions/billing no front.
 * Mantém contrato único de rotas protegidas.
 */
export async function requestSubscriptionsBilling<T>(params: {
  path: SubscriptionsBillingPath;
  method: SubscriptionsBillingMethod;
  body?: unknown;
}): Promise<T> {
  const { path, method, body } = params;

  if (method === "GET") {
    return api.get<T>(path);
  }

  return api.post<T>(path, body ?? {});
}

function withTimeout<T>(promise: Promise<T>, timeoutMs = TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(timeoutError()), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(id);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(id);
        reject(error);
      });
  });
}

async function withTransientRetry<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await withTimeout(operation());
    } catch (error: unknown) {
      const mapped = mapBillingError(error);
      lastError = mapped;

      const shouldRetry = mapped.retryable && attempt < MAX_ATTEMPTS;
      if (!shouldRetry) {
        throw mapped;
      }

      const delay = BASE_BACKOFF_MS * 2 ** (attempt - 1);
      await wait(delay);
    }
  }

  throw mapBillingError(lastError);
}

export const billingApi = {
  getMySubscription: (): Promise<MySubscriptionResponse> =>
    withTransientRetry(() =>
      requestSubscriptionsBilling<MySubscriptionResponse>({
        path: "/subscriptions/me",
        method: "GET",
      }),
    ),

  getBillingIdentity: (): Promise<BillingIdentityResponse> =>
    withTransientRetry(() =>
      requestSubscriptionsBilling<BillingIdentityResponse>({
        path: "/users/me/billing-identity",
        method: "GET",
      }),
    ),

  verifyApplePurchase: (
    appleTransactionId: string,
    appleSandbox = false,
  ): Promise<VerifyMobilePurchaseResponse> =>
    withTransientRetry(() =>
      requestSubscriptionsBilling<VerifyMobilePurchaseResponse>({
        path: "/billing/mobile/verify",
        method: "POST",
        body: {
          provider: "APPLE",
          appleTransactionId,
          appleSandbox,
        } satisfies VerifyApplePurchasePayload,
      }),
    ),

  verifyGooglePurchase: (
    googlePurchaseToken: string,
  ): Promise<VerifyMobilePurchaseResponse> =>
    withTransientRetry(() =>
      requestSubscriptionsBilling<VerifyMobilePurchaseResponse>({
        path: "/billing/mobile/verify",
        method: "POST",
        body: {
          provider: "GOOGLE",
          googlePurchaseToken,
        } satisfies VerifyGooglePurchasePayload,
      }),
    ),
};

export {
  BillingApiError,
  mapBillingError,
  mapEffectivePlanToSubscription,
} from "./billing.mappers";
export type {
  EffectivePlanResponse,
  MySubscriptionResponse,
  SubscriptionSnapshot,
} from "./billing.mappers";
