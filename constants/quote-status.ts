/**
 * Linguagem visual do status de uma demanda de orçamento.
 * Padrão de constants/weather.ts (label + ícone + cor + tint).
 */
import type MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { QuoteGroupStatus } from "@/services/quotes.service";

export interface QuoteStatusUi {
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
  tint: string;
}

export const QUOTE_STATUS_UI: Record<QuoteGroupStatus, QuoteStatusUi> = {
  OPEN: {
    label: "Em cotação",
    icon: "hourglass-empty",
    color: "#2563EB",
    tint: "#EFF6FF",
  },
  DECIDED: {
    label: "Decidido",
    icon: "check-circle",
    color: "#16A34A",
    tint: "#ECFDF5",
  },
};

/** Formata centavos como moeda BR (ex.: 1500000 → "R$ 15.000,00"). */
export function formatCentsBRL(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
