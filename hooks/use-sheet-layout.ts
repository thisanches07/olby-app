// hooks/use-sheet-layout.ts
import { useMemo } from "react";
import { ViewStyle } from "react-native";

import { useResponsive } from "@/hooks/use-responsive";

export interface SheetLayout {
  /** No tablet o sheet vira card centralizado; no phone fica ancorado embaixo. */
  centered: boolean;
  /**
   * Estilo do container que envolve o card (o irmão do backdrop).
   * No tablet centraliza nos dois eixos; no phone não interfere.
   */
  containerStyle: ViewStyle;
  /**
   * Overrides para mesclar no estilo do "sheet"/card já existente.
   * Mantém o visual do phone e só ajusta no tablet.
   */
  sheetStyle: ViewStyle;
}

/**
 * Converte um bottom-sheet de celular num diálogo centralizado em tablets,
 * sem reescrever o conteúdo: basta mesclar `sheetStyle` no card e envolver
 * (ou posicionar) com `containerStyle`.
 */
export function useSheetLayout(): SheetLayout {
  const { isTablet, dialogMaxWidth } = useResponsive();

  return useMemo(() => {
    if (!isTablet) {
      return {
        centered: false,
        containerStyle: {},
        sheetStyle: {},
      };
    }

    return {
      centered: true,
      containerStyle: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      },
      sheetStyle: {
        position: "relative",
        left: undefined,
        right: undefined,
        bottom: undefined,
        width: "100%",
        maxWidth: dialogMaxWidth,
        borderRadius: 24,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: "88%",
        overflow: "hidden",
      },
    };
  }, [isTablet, dialogMaxWidth]);
}
