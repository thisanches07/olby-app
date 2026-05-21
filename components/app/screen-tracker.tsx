import { useEffect, useRef } from "react";
import { usePathname } from "expo-router";

import { AnalyticsEvents } from "@/types/analytics-events";
import { screen, track } from "@/services/analytics";

/**
 * Escuta `usePathname()` e dispara um `posthog.screen(...)` com nome canônico
 * a cada mudança de rota.
 *
 * Por que nome canônico? Dynamic routes (`/obra/abc-123`) viram milhares de
 * "screens" distintas se mandadas crus — quebra funis e enche a UI de ruído.
 * Mapeamos pra `obra_detail` e mandamos o id como propriedade.
 */
type ScreenInfo = {
  name: string;
  props?: Record<string, unknown>;
};

function mapPathToScreen(pathname: string): ScreenInfo {
  if (!pathname || pathname === "/" || pathname === "/(tabs)") {
    return { name: "home" };
  }

  // dynamic routes — extrai o id e envia como propriedade
  const obraMatch = pathname.match(/^\/obra\/([^/?#]+)/);
  if (obraMatch) return { name: "obra_detail", props: { project_id: obraMatch[1] } };

  const diarioMatch = pathname.match(/^\/diario\/([^/?#]+)/);
  if (diarioMatch) return { name: "diario_detail", props: { entry_id: diarioMatch[1] } };

  const orcamentoMatch = pathname.match(/^\/orcamentos\/([^/?#]+)/);
  if (orcamentoMatch) return { name: "orcamento_detail", props: { quote_id: orcamentoMatch[1] } };

  const reportMatch = pathname.match(/^\/report\/([^/?#]+)/);
  if (reportMatch) return { name: "report_detail", props: { report_id: reportMatch[1] } };

  // rotas planas com nomes canônicos
  const staticMap: Record<string, string> = {
    "/login": "login",
    "/profile": "profile",
    "/notifications": "notifications",
    "/invite": "invite",
    "/subscription/plans": "subscription_plans",
    "/subscription/my-plan": "subscription_my_plan",
    "/modal": "modal",
    "/forgot-password": "forgot_password",
  };

  const known = staticMap[pathname];
  if (known) return { name: known };

  // fallback genérico — útil pra detectar rotas novas
  return { name: pathname.replace(/^\/+/, "").replace(/\//g, "_") || "unknown" };
}

export function ScreenTracker() {
  const pathname = usePathname();
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    // evita disparos duplicados no mesmo path (re-render do layout).
    if (lastSent.current === pathname) return;
    lastSent.current = pathname;

    const { name, props } = mapPathToScreen(pathname);
    screen(name, props);

    // Funil de assinatura: a abertura da tela de planos é o "paywall_viewed".
    if (name === "subscription_plans") {
      track(AnalyticsEvents.PAYWALL_VIEWED, { source: pathname });
    }
  }, [pathname]);

  return null;
}
