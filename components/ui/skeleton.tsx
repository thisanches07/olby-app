import React, { useEffect } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({ width, height = 16, borderRadius = 6, style }: SkeletonProps) {
  const shimmer = useSharedValue(-1);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(shimmer.value, [-1, 1], [-300, 300]),
      },
    ],
  }));

  return (
    <View
      style={[
        styles.base,
        { width, height, borderRadius },
        style,
      ]}
      accessibilityElementsHidden
    >
      <Animated.View style={[StyleSheet.absoluteFill, styles.shimmer, shimmerStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },
  shimmer: {
    backgroundColor: "rgba(255,255,255,0.55)",
    borderRadius: 999,
    width: 80,
  },
});
