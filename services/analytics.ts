import type { PostHog } from "posthog-react-native";
import type {
  AnalyticsEvent,
  EventProps,
} from "@/types/analytics-events";

// PostHog tipa propriedades como JsonType. Os payloads tipados em
// types/analytics-events.ts já obedecem JSON; o cast é só para satisfazer
// o type system sem perder type safety na API pública (`track`, `identify`).
type PHProps = Parameters<PostHog["capture"]>[1];

/**
 * Wrapper fino sobre o cliente PostHog.
 *
 * O cliente real é criado pelo `<PostHogProvider>` em `app/_layout.tsx`
 * e injetado aqui pelo `AnalyticsBridge` via `initAnalytics(client)`.
 *
 * Antes de `initAnalytics` rodar (ou se o usuário tiver dado opt-out), todas
 * as chamadas viram no-op silenciosamente — assim instrumentação espalhada
 * pelo app nunca quebra a UI.
 */

let posthog: PostHog | null = null;

export function initAnalytics(client: PostHog | null) {
  posthog = client;
}

export function getAnalyticsClient(): PostHog | null {
  return posthog;
}

export function track<E extends AnalyticsEvent>(
  event: E,
  props?: EventProps[E],
) {
  posthog?.capture(event, props as PHProps);
}

export function identify(
  userId: string,
  traits?: Record<string, unknown>,
) {
  posthog?.identify(userId, traits as PHProps);
}

export function register(superProps: Record<string, unknown>) {
  posthog?.register(superProps as NonNullable<PHProps>);
}

export function resetAnalytics() {
  posthog?.reset();
}

export function screen(name: string, props?: Record<string, unknown>) {
  posthog?.screen(name, props as PHProps);
}

export function optIn() {
  posthog?.optIn();
}

export function optOut() {
  posthog?.optOut();
}
