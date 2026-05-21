import { useEffect } from "react";
import Constants from "expo-constants";
import { usePostHog } from "posthog-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/contexts/subscription-context";
import { useOnboarding } from "@/contexts/onboarding-context";
import {
  identify,
  initAnalytics,
  optIn,
  optOut,
  register,
  resetAnalytics,
} from "@/services/analytics";

/**
 * Centraliza toda a "cola" entre os contextos do app e o cliente PostHog:
 *  1. Captura o client criado pelo <PostHogProvider> e injeta em services/analytics.ts.
 *  2. Identifica/reset conforme o usuário Firebase loga ou desloga.
 *  3. Aplica super-properties dinâmicas (plano, role, app version) quando mudam.
 *  4. Respeita o opt-out persistido em AsyncStorage.
 *
 * Não renderiza UI — é um efeito lateral que vive na árvore.
 */
export const ANALYTICS_OPT_OUT_STORAGE_KEY = "analytics:optedOut";

export function AnalyticsBridge() {
  const client = usePostHog();
  const { user, backendUserId } = useAuth();
  const { plan } = useSubscription();
  const { role } = useOnboarding();

  // (1) Disponibiliza o client globalmente + aplica opt-out persistido na primeira montagem.
  useEffect(() => {
    initAnalytics(client ?? null);
    if (!client) return;

    let cancelled = false;
    AsyncStorage.getItem(ANALYTICS_OPT_OUT_STORAGE_KEY)
      .then((value) => {
        if (cancelled) return;
        if (value === "true") {
          optOut();
        } else {
          optIn();
        }
      })
      .catch(() => {
        // sem opt-out persistido → permanece opted-in (default seguro pro dev).
      });

    return () => {
      cancelled = true;
    };
  }, [client]);

  // (2) Identify / reset acompanhando o Firebase Auth.
  useEffect(() => {
    if (!client) return;

    if (user) {
      identify(user.uid, {
        email: user.email ?? undefined,
        provider: user.providerData[0]?.providerId,
        backend_user_id: backendUserId ?? undefined,
      });
    } else {
      resetAnalytics();
    }
  }, [client, user, backendUserId]);

  // (3) Super-properties — mandadas com TODO evento dali em diante.
  useEffect(() => {
    if (!client) return;
    register({
      current_plan: plan?.code ?? "FREE",
      subscription_status: plan?.subscriptionStatus ?? null,
      is_ambassador: plan?.subscriptionStatus === "AMBASSADOR",
      user_role: role ?? "unknown",
      app_version: Constants.expoConfig?.version ?? "unknown",
    });
  }, [client, plan?.code, plan?.subscriptionStatus, role]);

  return null;
}
