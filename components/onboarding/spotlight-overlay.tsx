import React, { useEffect } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { shadow } from "@/theme/shadows";
import { spacing } from "@/theme/spacing";

const OVERLAY_OPACITY = 0.72;
const HOLE_PADDING = 10;
const HOLE_RADIUS = 12;
const TOOLTIP_HEIGHT_ESTIMATE = 180;

export interface TargetLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SpotlightOverlayProps {
  visible: boolean;
  targetLayout: TargetLayout | null;
  title: string;
  body: string;
  stepLabel: string;
  onNext: () => void;
  onSkip: () => void;
  nextLabel?: string;
  showSkip?: boolean;
}

function roundedRectPath(x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  const right = x + w;
  const bottom = y + h;

  return [
    `M ${x + radius} ${y}`,
    `H ${right - radius}`,
    `Q ${right} ${y} ${right} ${y + radius}`,
    `V ${bottom - radius}`,
    `Q ${right} ${bottom} ${right - radius} ${bottom}`,
    `H ${x + radius}`,
    `Q ${x} ${bottom} ${x} ${bottom - radius}`,
    `V ${y + radius}`,
    `Q ${x} ${y} ${x + radius} ${y}`,
    "Z",
  ].join(" ");
}

export function SpotlightOverlay({
  visible,
  targetLayout,
  title,
  body,
  stepLabel,
  onNext,
  onSkip,
  nextLabel = "Próximo",
  showSkip = true,
}: SpotlightOverlayProps) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const overlayOpacity = useSharedValue(0);
  const tooltipTranslateY = useSharedValue(20);
  const tooltipOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      overlayOpacity.value = withTiming(1, { duration: 220 });
      tooltipOpacity.value = withTiming(1, { duration: 260 });
      tooltipTranslateY.value = withSpring(0, { damping: 18, stiffness: 200 });
    } else {
      overlayOpacity.value = withTiming(0, { duration: 160 });
      tooltipOpacity.value = withTiming(0, { duration: 140 });
      tooltipTranslateY.value = 20;
    }
  }, [visible, overlayOpacity, tooltipOpacity, tooltipTranslateY]);

  // Re-animate tooltip on step change (targetLayout changes)
  useEffect(() => {
    if (!visible) return;
    tooltipOpacity.value = 0;
    tooltipTranslateY.value = 16;
    tooltipOpacity.value = withTiming(1, { duration: 240 });
    tooltipTranslateY.value = withSpring(0, { damping: 18, stiffness: 200 });
  }, [targetLayout, visible, tooltipOpacity, tooltipTranslateY]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const tooltipStyle = useAnimatedStyle(() => ({
    opacity: tooltipOpacity.value,
    transform: [{ translateY: tooltipTranslateY.value }],
  }));

  if (!visible) return null;

  // Hole bounds (with padding)
  const hole = targetLayout
    ? (() => {
        const x = Math.max(0, targetLayout.x - HOLE_PADDING);
        const y = Math.max(0, targetLayout.y - HOLE_PADDING);
        return {
          x,
          y,
          w: Math.min(targetLayout.width + HOLE_PADDING * 2, screenW - x),
          h: Math.min(targetLayout.height + HOLE_PADDING * 2, screenH - y),
        };
      })()
    : null;

  const overlayPath = hole
    ? `M 0 0 H ${screenW} V ${screenH} H 0 Z ${roundedRectPath(
        hole.x,
        hole.y,
        hole.w,
        hole.h,
        HOLE_RADIUS,
      )}`
    : "";

  // Tooltip position: below hole if space allows, otherwise above
  let tooltipTop: number | undefined;
  let tooltipBottom: number | undefined;
  const tooltipMargin = 18;

  if (hole) {
    const spaceBelow = screenH - (hole.y + hole.h);
    if (spaceBelow >= TOOLTIP_HEIGHT_ESTIMATE + tooltipMargin) {
      tooltipTop = hole.y + hole.h + tooltipMargin;
    } else {
      tooltipBottom = screenH - hole.y + tooltipMargin;
    }
  } else {
    // No target: centered card
    tooltipTop = screenH / 2 - TOOLTIP_HEIGHT_ESTIMATE / 2;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onSkip}
    >
      <Animated.View style={[StyleSheet.absoluteFill, overlayStyle]}>
        {hole ? (
          <>
            <Svg
              width={screenW}
              height={screenH}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            >
              <Path
                d={overlayPath}
                fill={`rgba(15,23,42,${OVERLAY_OPACITY})`}
                fillRule="evenodd"
              />
            </Svg>
            {/* Hole border highlight */}
            <View
              pointerEvents="none"
              style={[
                styles.holeBorder,
                {
                  top: hole.y - 2,
                  left: hole.x - 2,
                  width: hole.w + 4,
                  height: hole.h + 4,
                  borderRadius: HOLE_RADIUS + 2,
                },
              ]}
            />
          </>
        ) : (
          // ── Full dim (no target = centered card step) ─────────────────────
          <View style={[styles.overlayRect, StyleSheet.absoluteFill]} />
        )}

        {/* ── Tooltip card ─────────────────────────────────────────────────── */}
        <Animated.View
          style={[
            styles.tooltip,
            tooltipStyle,
            tooltipTop !== undefined ? { top: tooltipTop } : { bottom: tooltipBottom },
          ]}
        >
          <View style={styles.tooltipHeader}>
            <Text style={styles.stepLabel}>{stepLabel}</Text>
          </View>
          <Text style={styles.tooltipTitle}>{title}</Text>
          <Text style={styles.tooltipBody}>{body}</Text>

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.nextBtn,
                pressed && styles.nextBtnPressed,
              ]}
              onPress={onNext}
            >
              <Text style={styles.nextBtnText}>{nextLabel}</Text>
            </Pressable>
            {showSkip && (
              <Pressable onPress={onSkip} style={styles.skipBtn}>
                <Text style={styles.skipText}>Pular tour</Text>
              </Pressable>
            )}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayRect: {
    position: "absolute",
    backgroundColor: `rgba(15,23,42,${OVERLAY_OPACITY})`,
  },
  holeBorder: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
    borderRadius: HOLE_RADIUS,
  },
  tooltip: {
    position: "absolute",
    left: spacing[16],
    right: spacing[16],
    backgroundColor: "#fff",
    borderRadius: radius["2xl"],
    padding: spacing[20],
    gap: spacing[8],
    ...shadow(3),
  },
  tooltipHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  tooltipTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  tooltipBody: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 21,
  },
  actions: {
    marginTop: spacing[4],
    gap: spacing[4],
    alignItems: "center",
  },
  nextBtn: {
    width: "100%",
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingVertical: spacing[14],
    alignItems: "center",
  },
  nextBtnPressed: { opacity: 0.85 },
  nextBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: -0.2,
  },
  skipBtn: {
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[16],
  },
  skipText: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "500",
  },
});
