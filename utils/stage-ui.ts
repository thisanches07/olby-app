import type { ActivityStatus, StageStatus } from "@/data/obras";

interface StatusVisual {
  label: string;
  color: string; // texto/ícone
  bg: string; // fundo do chip
  dot: string; // ponto/realce
}

export const STAGE_STATUS_CONFIG: Record<StageStatus, StatusVisual> = {
  NOT_STARTED: {
    label: "Não iniciada",
    color: "#6B7280",
    bg: "#F3F4F6",
    dot: "#9CA3AF",
  },
  IN_PROGRESS: {
    label: "Em andamento",
    color: "#1D4ED8",
    bg: "#EFF6FF",
    dot: "#2563EB",
  },
  COMPLETED: {
    label: "Concluída",
    color: "#15803D",
    bg: "#DCFCE7",
    dot: "#22C55E",
  },
};

export const ACTIVITY_STATUS_CONFIG: Record<ActivityStatus, StatusVisual> = {
  PENDING: {
    label: "Pendente",
    color: "#6B7280",
    bg: "#F3F4F6",
    dot: "#9CA3AF",
  },
  IN_PROGRESS: {
    label: "Em andamento",
    color: "#B45309",
    bg: "#FEF3C7",
    dot: "#F59E0B",
  },
  DONE: {
    label: "Concluída",
    color: "#15803D",
    bg: "#DCFCE7",
    dot: "#22C55E",
  },
};

export const STAGE_STATUS_ORDER: StageStatus[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETED",
];

/** Cor da barra de progresso conforme o avanço. */
export function progressBarColor(progress: number | null): string {
  if (progress == null) return "#E5E7EB";
  if (progress >= 1) return "#22C55E";
  return "#2563EB";
}

/** Rótulo de progresso. null → "Sem atividades" (nunca 0%). */
export function progressLabel(
  progress: number | null,
  completed: number,
  total: number,
): string {
  if (progress == null || total === 0) return "Sem atividades";
  return `${completed}/${total} · ${Math.round(progress * 100)}%`;
}
