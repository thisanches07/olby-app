// hooks/use-responsive.ts
import { useMemo } from "react";
import { useWindowDimensions } from "react-native";

import {
  contentWidth,
  deviceClassFor,
  dialogWidth,
  gridMinCardWidth,
  screenPadding,
  type DeviceClass,
} from "@/theme/breakpoints";

export interface Responsive {
  width: number;
  height: number;
  deviceClass: DeviceClass;
  isPhone: boolean;
  /** tablet OU largeTablet — use para a maioria das decisões de layout. */
  isTablet: boolean;
  isLargeTablet: boolean;
  /** Padding horizontal recomendado para a borda da tela. */
  screenHPadding: number;
  /**
   * Estilo pronto para centralizar uma coluna de conteúdo com largura máxima.
   * No phone é praticamente transparente (ocupa 100%).
   */
  contentColumn: (
    density?: keyof typeof contentWidth,
  ) => { width: "100%"; maxWidth: number; alignSelf: "center" };
  /** Largura máxima de um diálogo centralizado (modal vira card no tablet). */
  dialogMaxWidth: number;
  /**
   * Nº de colunas para uma grade, dado o espaço útil e um card mínimo.
   * Sempre >= 1; no phone retorna 1 (salvo se pedir minCardWidth pequeno).
   */
  gridColumns: (opts?: {
    minCardWidth?: number;
    maxColumns?: number;
    horizontalPadding?: number;
    gap?: number;
  }) => number;
}

export function useResponsive(): Responsive {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const deviceClass = deviceClassFor(width);
    const isLargeTablet = deviceClass === "largeTablet";
    const isTablet = deviceClass !== "phone";
    const isPhone = deviceClass === "phone";

    const screenHPadding = isLargeTablet
      ? screenPadding.largeTablet
      : isTablet
        ? screenPadding.tablet
        : screenPadding.phone;

    const contentColumn = (density: keyof typeof contentWidth = "default") => ({
      width: "100%" as const,
      maxWidth: contentWidth[density],
      alignSelf: "center" as const,
    });

    const gridColumns = (opts?: {
      minCardWidth?: number;
      maxColumns?: number;
      horizontalPadding?: number;
      gap?: number;
    }) => {
      const minCardWidth = opts?.minCardWidth ?? gridMinCardWidth;
      const maxColumns =
        opts?.maxColumns ?? (isLargeTablet ? 3 : isTablet ? 2 : 1);
      const hPad = opts?.horizontalPadding ?? screenHPadding;
      const gap = opts?.gap ?? 16;

      if (isPhone) return 1;

      const usable = Math.max(0, width - hPad * 2);
      const fit = Math.floor((usable + gap) / (minCardWidth + gap));
      return Math.max(1, Math.min(maxColumns, fit));
    };

    return {
      width,
      height,
      deviceClass,
      isPhone,
      isTablet,
      isLargeTablet,
      screenHPadding,
      contentColumn,
      dialogMaxWidth: isLargeTablet ? dialogWidth.large : dialogWidth.default,
      gridColumns,
    };
  }, [width, height]);
}
