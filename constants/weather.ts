/**
 * Fonte única de verdade para a apresentação do clima do Diário de Obra.
 *
 * Linguagem visual compartilhada entre o seletor (entry-form-modal) e o badge
 * da timeline (diary-entry-card). O relatório HTML (report-html.ts) espelha os
 * mesmos label/cor com SVGs próprios, pois HTML/print não carrega fontes de
 * ícone do React Native.
 */
import type MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import type { DiaryWeather } from "@/services/daily-log-entries.service";

export interface WeatherUi {
  /** Rótulo compacto para tiles e badges. */
  label: string;
  /** Rótulo por extenso (relatório / contextos com mais espaço). */
  labelFull: string;
  /** Ícone do conjunto MaterialCommunityIcons (já incluso em @expo/vector-icons). */
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  /** Cor forte: ícone, borda e estado selecionado. */
  color: string;
  /** Fundo suave: tile selecionado / badge. */
  tint: string;
}

export const WEATHER_UI: Record<DiaryWeather, WeatherUi> = {
  SUNNY: {
    label: "Sol",
    labelFull: "Sol",
    icon: "weather-sunny",
    color: "#F59E0B",
    tint: "#FEF3C7",
  },
  PARTLY_CLOUDY: {
    label: "Parcial",
    labelFull: "Parcialmente nublado",
    icon: "weather-partly-cloudy",
    color: "#0EA5E9",
    tint: "#E0F2FE",
  },
  CLOUDY: {
    label: "Nublado",
    labelFull: "Nublado",
    icon: "weather-cloudy",
    color: "#64748B",
    tint: "#F1F5F9",
  },
  RAINY: {
    label: "Chuva",
    labelFull: "Chuva",
    icon: "weather-pouring",
    color: "#2563EB",
    tint: "#EFF6FF",
  },
  STORM: {
    label: "Tempestade",
    labelFull: "Tempestade",
    icon: "weather-lightning-rainy",
    color: "#6366F1",
    tint: "#EEF2FF",
  },
  FOG: {
    label: "Neblina",
    labelFull: "Neblina",
    icon: "weather-fog",
    color: "#6B7280",
    tint: "#F3F4F6",
  },
};

/** Ordem canônica de exibição (grade do seletor, etc.). */
export const WEATHER_ORDER: DiaryWeather[] = [
  "SUNNY",
  "PARTLY_CLOUDY",
  "CLOUDY",
  "RAINY",
  "STORM",
  "FOG",
];
