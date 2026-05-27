import { Platform } from "react-native";

import type { SubscriptionProvider } from "@/services/billing.mappers";
import { OBLY_ACCOUNT_URL } from "@/utils/legal";

export function getCurrentPlatformProvider(): "APPLE" | "GOOGLE" | null {
  if (Platform.OS === "ios") return "APPLE";
  if (Platform.OS === "android") return "GOOGLE";
  return null;
}

export function isManagedElsewhere(provider: SubscriptionProvider): boolean {
  if (!provider) return false;
  return provider !== getCurrentPlatformProvider();
}

export type ManagedElsewhereCopy = {
  title: string;
  body: string;
  cta?: { label: string; url: string };
};

export function getManagedElsewhereCopy(
  provider: SubscriptionProvider,
): ManagedElsewhereCopy | null {
  if (!isManagedElsewhere(provider)) return null;

  if (provider === "STRIPE") {
    return {
      title: "Assinatura gerenciada no site",
      body: "Sua assinatura foi feita pelo site Obly. Acesse oblyapp.com/perfil para alterar, cancelar ou trocar de plano.",
      cta: { label: "Abrir oblyapp.com", url: OBLY_ACCOUNT_URL },
    };
  }

  if (provider === "APPLE") {
    return {
      title: "Assinatura gerenciada no iPhone",
      body: "Sua assinatura foi feita pela App Store no seu iPhone/iPad. Para alterar ou cancelar, abra o app de Ajustes em um dispositivo iOS conectado à mesma Apple ID.",
    };
  }

  if (provider === "GOOGLE") {
    return {
      title: "Assinatura gerenciada no Android",
      body: "Sua assinatura foi feita pelo Google Play. Para alterar ou cancelar, abra o Google Play em um dispositivo Android conectado à mesma conta Google.",
    };
  }

  return null;
}
