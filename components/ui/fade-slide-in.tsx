import React, { useEffect } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";

interface FadeSlideInProps {
  /** Índice do item na lista — define o delay do stagger */
  index?: number;
  /** ms de delay base por índice. Padrão: 55 */
  staggerMs?: number;
  /** Direção de entrada. Padrão: "bottom" */
  from?: "bottom" | "top";
  children: React.ReactNode;
}

/**
 * Anima entrada de elementos com fade + slide staggerado.
 * Ideal para listas — envolva cada item com este componente.
 */
export function FadeSlideIn({
  index = 0,
  staggerMs = 55,
  from = "bottom",
  children,
}: FadeSlideInProps) {
  // Limita o delay em 8 itens para não atrasar cards fora do viewport
  const cappedIndex = Math.min(index, 8);
  const delay = cappedIndex * staggerMs;

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(from === "bottom" ? 20 : -20);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
    translateY.value = withDelay(
      delay,
      withSpring(0, { damping: 20, stiffness: 260, mass: 0.8 }),
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={animStyle}>{children}</Animated.View>;
}
