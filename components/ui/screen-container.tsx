import React from "react";
import { StyleProp, View, ViewStyle } from "react-native";

import { useResponsive } from "@/hooks/use-responsive";
import { contentWidth } from "@/theme/breakpoints";

interface ScreenContainerProps {
  children: React.ReactNode;
  /** Densidade de leitura: narrow (forms), default (detalhe), wide (grades). */
  density?: keyof typeof contentWidth;
  /** Aplica padding horizontal adaptativo às bordas. */
  padded?: boolean;
  /** flex:1 para preencher a área disponível (telas de scroll/flex). */
  fill?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Centraliza o conteúdo numa coluna com largura máxima legível e respiro
 * adaptativo nas laterais. No phone é transparente (ocupa 100%); no tablet
 * mantém a mesma linguagem visual sem esticar o layout.
 */
export function ScreenContainer({
  children,
  density = "default",
  padded = false,
  fill = false,
  style,
}: ScreenContainerProps) {
  const { contentColumn, screenHPadding, isPhone } = useResponsive();

  return (
    <View
      style={[
        fill && { flex: 1 },
        contentColumn(density),
        padded && { paddingHorizontal: isPhone ? 0 : screenHPadding },
        style,
      ]}
    >
      {children}
    </View>
  );
}
