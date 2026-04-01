import React from "react";
import { Pressable, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { tapLight } from "@/utils/haptics";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableScaleProps {
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  disabled?: boolean;
  /** Estilo de haptic no press. "none" desativa. Padrão: "light" */
  haptic?: "light" | "none";
  children: React.ReactNode;
}

/**
 * Substitui TouchableOpacity com escala animada via Reanimated (UI thread).
 * Feedback visual + haptic mais responsivo e fluido em Android/iOS.
 */
export function PressableScale({
  onPress,
  onLongPress,
  style,
  scaleTo = 0.97,
  disabled = false,
  haptic = "light",
  children,
}: PressableScaleProps) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      style={[style, animStyle]}
      onPressIn={() => {
        scale.value = withSpring(scaleTo, { damping: 15, stiffness: 300 });
        if (haptic === "light") tapLight();
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      }}
      onPress={disabled ? undefined : onPress}
      onLongPress={disabled ? undefined : onLongPress}
      disabled={disabled}
    >
      {children}
    </AnimatedPressable>
  );
}
