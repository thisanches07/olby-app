import { StatusType } from "@/components/obra-card";

export const PRIMARY = "#2563EB";
export const PRIMARY_LIGHT = "#E8ECFF";

export const STATUS_CONFIG: Record<
  StatusType,
  { label: string; color: string; bg: string; dot: string }
> = {
  em_andamento: {
    label: "EM ANDAMENTO",
    color: "#16A34A",
    bg: "#DCFCE7",
    dot: "#22C55E",
  },
  concluida: {
    label: "CONCLUÍDA",
    color: "#15803D",
    bg: "#DCFCE7",
    dot: "#22C55E",
  },
  pausada: {
    label: "PAUSADA",
    color: "#B45309",
    bg: "#FEF3C7",
    dot: "#F59E0B",
  },
  planejamento: {
    label: "PLANEJAMENTO",
    color: "#6D28D9",
    bg: "#EDE9FE",
    dot: "#8B5CF6",
  },
};

export const PROGRESS_COLOR: Record<StatusType, string> = {
  em_andamento: PRIMARY,
  concluida: "#22C55E",
  pausada: "#F59E0B",
  planejamento: "#8B5CF6",
};

export const PRIORITY_CONFIG: Record<string, { color: string; label: string }> =
  {
    ALTA: { color: "#DC2626", label: "Alta" },
    MEDIA: { color: "#EA580C", label: "Média" },
    BAIXA: { color: "#22C55E", label: "Baixa" },
  };

export const GALLERY_IMAGES = [
  "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=500&q=80",
  "https://images.unsplash.com/photo-1581094271901-8022df4466f9?w=500&q=80",
  "https://images.unsplash.com/photo-1503387762-592411216cff?w=500&q=80",
  "https://images.unsplash.com/photo-1587395854846-8e3494dbc759?w=500&q=80",
  "https://images.unsplash.com/photo-1516876437184-593fda40c7ce?w=500&q=80",
  "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=500&q=80",
  "https://images.unsplash.com/photo-1463797221720-6b07e6426c24?w=500&q=80",
  "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=500&q=80",
];

export function formatBRL(value: number, decimals = true): string {
  if (value === 0) return "—";
  return (
    "R$ " +
    value.toLocaleString("pt-BR", {
      minimumFractionDigits: decimals ? 2 : 0,
      maximumFractionDigits: decimals ? 2 : 0,
    })
  );
}

/**
 * Formata string de dígitos puros (centavos) para exibição BRL.
 * Ex: "25000000" → "250.000,00"  |  "150" → "1,50"  |  "" → ""
 */
export function formatBRLInput(digits: string): string {
  if (!digits) return "";
  const num = parseInt(digits, 10);
  if (isNaN(num) || num === 0) return "";
  return (num / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatCompact(value: number): string {
  if (value >= 1_000_000) return `R$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$${Math.round(value / 1_000)}k`;
  return `R$${value}`;
}

export function getPriorityConfig(priority: string) {
  return PRIORITY_CONFIG[priority] || { color: "#6B7280", label: "MÉDIA" };
}
