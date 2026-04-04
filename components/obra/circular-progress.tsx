import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

import { PRIMARY_LIGHT } from "@/utils/obra-utils";

interface CircularProgressProps {
  value?: number; // 0..100
  size?: number;
  strokeWidth?: number;
  label?: string; // ex: "CONCLUSÃO"
  subtitle?: string;
}

function clamp(v: number) {
  return Math.max(0, Math.min(100, v));
}

export function CircularProgress({
  value = 68,
  size = 180,
  strokeWidth = 14,
  label = "CONCLUSÃO",
  subtitle,
}: CircularProgressProps) {
  const PRIMARY = "#2563EB";

  const { radius, circumference, cx, cy } = useMemo(() => {
    const r = (size - strokeWidth) / 2;
    return {
      radius: r,
      circumference: 2 * Math.PI * r,
      cx: size / 2,
      cy: size / 2,
    };
  }, [size, strokeWidth]);

  /**
   * SAFE CENTER AREA (miolo do círculo)
   * - garante que o texto não encoste no stroke
   */
  const extraPadding = Math.max(10, Math.round(strokeWidth * 0.9));
  const innerSize = Math.max(0, size - strokeWidth * 2 - extraPadding * 2);

  /**
   * Fonte do número:
   * - mais conservadora para não “invadir” o arco
   * - mantém 1 linha sempre
   */
  const valueFont = Math.max(16, Math.round(innerSize * 0.30));

  const labelFont = Math.max(11, Math.round(size * 0.075));
  const subtitleFont = Math.max(10, Math.round(size * 0.062));

  const [displayPercent, setDisplayPercent] = useState(() =>
    Math.round(clamp(value)),
  );

  useEffect(() => {
    setDisplayPercent(Math.round(clamp(value)));
  }, [value]);

  const progress = useRef(new Animated.Value(0)).current;
  const circleRef = useRef<any>(null);

  useEffect(() => {
    const toValue = clamp(Number.isFinite(value) ? value : 0);

    progress.stopAnimation();

    const anim = Animated.timing(progress, {
      toValue,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });

    let last = -1;

    const id = progress.addListener(({ value: v }) => {
      const p = clamp(v) / 100;
      const dashOffset = circumference * (1 - p);

      circleRef.current?.setNativeProps({
        strokeDashoffset: dashOffset,
      });

      const rounded = Math.round(clamp(v));
      if (rounded !== last) {
        last = rounded;
        setDisplayPercent(rounded);
      }
    });

    anim.start();

    return () => {
      progress.removeListener(id);
    };
  }, [value, circumference, progress]);

  return (
    <View style={styles.container}>
      <View style={[styles.ringWrap, { width: size, height: size }]}>
        {/* Glow discreto atrás (premium) */}
        <View
          pointerEvents="none"
          style={[
            styles.glow,
            {
              width: size * 0.88,
              height: size * 0.88,
              borderRadius: (size * 0.88) / 2,
              backgroundColor: PRIMARY,
              opacity: 0.14,
            },
          ]}
        />

        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={PRIMARY} stopOpacity={1} />
              <Stop offset="55%" stopColor={PRIMARY} stopOpacity={0.92} />
              <Stop offset="100%" stopColor={PRIMARY} stopOpacity={0.75} />
            </LinearGradient>
          </Defs>

          {/* trilho */}
          <Circle
            cx={cx}
            cy={cy}
            r={radius}
            stroke={PRIMARY_LIGHT}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="transparent"
          />

          {/* progresso (começa no topo) */}
          <Circle
            ref={circleRef}
            cx={cx}
            cy={cy}
            r={radius}
            stroke="url(#grad)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="transparent"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        </Svg>

        {/* Centro só com o número */}
        <View
          style={[
            styles.center,
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
            },
          ]}
        >
          <Text
            style={[
              styles.valueText,
              {
                fontSize: valueFont,
                lineHeight: Math.round(valueFont * 1.02),
              },
            ]}
            numberOfLines={1}
            allowFontScaling={false}
          >
            {displayPercent}%
          </Text>
        </View>
      </View>

      {/* Label fora do círculo */}
      <Text
        style={[styles.labelText, { fontSize: labelFont }]}
        allowFontScaling={false}
      >
        {label}
      </Text>

      {!!subtitle && (
        <Text
          style={[styles.subtitleText, { fontSize: subtitleFont }]}
          allowFontScaling={false}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center" },

  ringWrap: {
    alignItems: "center",
    justifyContent: "center",
  },

  glow: {
    position: "absolute",
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },

  center: {
    alignItems: "center",
    justifyContent: "center",
  },

  valueText: {
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -1.2,
    includeFontPadding: false,
    textAlign: "center",
  },

  labelText: {
    marginTop: 12,
    fontWeight: "800",
    color: "#9CA3AF",
    letterSpacing: 1.2,
    includeFontPadding: false,
    textAlign: "center",
  },

  subtitleText: {
    marginTop: 6,
    fontWeight: "700",
    color: "#6B7280",
    letterSpacing: 0.2,
    includeFontPadding: false,
    textAlign: "center",
  },
});
