import { AppLogo } from "@/components/app/app-logo";
import { Skeleton } from "@/components/ui/skeleton";
import { colors } from "@/theme/colors";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

function StatusRail() {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 850, easing: Easing.out(Easing.ease) }),
        withTiming(0, { duration: 850, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [pulse]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.45, 1]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.12]) }],
  }));

  return (
    <View style={styles.statusRail}>
      <Animated.View style={[styles.statusDot, dotStyle]} />
      <Text style={styles.statusText}>Validando sua sessão</Text>
    </View>
  );
}

function LoadingDots() {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
  }, [progress]);

  return (
    <View style={styles.loadingDots}>
      {[0, 1, 2].map((index) => (
        <LoadingDot key={index} index={index} progress={progress} />
      ))}
    </View>
  );
}

function LoadingDot({
  index,
  progress,
}: {
  index: number;
  progress: SharedValue<number>;
}) {
  const dotStyle = useAnimatedStyle(() => {
    const phase = (progress.value + index * 0.22) % 1;

    return {
      opacity: interpolate(
        phase,
        [0, 0.35, 0.7, 1],
        [0.24, 1, 0.42, 0.24],
        Extrapolation.CLAMP,
      ),
      transform: [
        {
          scale: interpolate(
            phase,
            [0, 0.35, 0.7, 1],
            [0.92, 1.12, 0.98, 0.92],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  return <Animated.View style={[styles.loadingDot, dotStyle]} />;
}

function SurfacePreview() {
  return (
    <View style={styles.previewCard}>
      <View style={styles.previewHeader}>
        <View style={styles.previewTitleStack}>
          <Skeleton width={62} height={10} borderRadius={999} />
          <Skeleton width={156} height={18} borderRadius={7} style={styles.mt12} />
        </View>
        <View style={styles.previewBadge}>
          <Skeleton width={32} height={32} borderRadius={16} />
        </View>
      </View>

      <View style={styles.previewList}>
        <Skeleton width="92%" height={11} borderRadius={6} />
        <Skeleton width="100%" height={11} borderRadius={6} style={styles.mt10} />
        <Skeleton width="74%" height={11} borderRadius={6} style={styles.mt10} />
      </View>

      <View style={styles.metricRow}>
        <View style={styles.metricCard}>
          <Skeleton width={42} height={18} borderRadius={7} />
          <Skeleton width={64} height={10} borderRadius={6} style={styles.mt10} />
        </View>
        <View style={styles.metricCard}>
          <Skeleton width={42} height={18} borderRadius={7} />
          <Skeleton width={68} height={10} borderRadius={6} style={styles.mt10} />
        </View>
      </View>
    </View>
  );
}

export function BootstrapLoadingScreen() {
  const heroProgress = useSharedValue(0);
  const logoPulse = useSharedValue(0);

  useEffect(() => {
    heroProgress.value = withTiming(1, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });
    logoPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [heroProgress, logoPulse]);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: heroProgress.value,
    transform: [
      {
        translateY: interpolate(heroProgress.value, [0, 1], [12, 0]),
      },
    ],
  }));

  const logoShellStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(logoPulse.value, [0, 1], [1, 1.03]) }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(logoPulse.value, [0, 1], [0.14, 0.3]),
    transform: [{ scale: interpolate(logoPulse.value, [0, 1], [0.96, 1.08]) }],
  }));

  const loaderStyle = useAnimatedStyle(() => ({
    opacity: interpolate(logoPulse.value, [0, 1], [0.76, 1]),
  }));

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <LinearGradient
        colors={["#0E2F8A", "#2563EB", "#7DB7FF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.92 }}
        style={styles.background}
      >
        <LinearGradient
          colors={[
            "rgba(37,99,235,0.18)",
            "rgba(125,183,255,0.12)",
            "rgba(255,255,255,0)",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.topGlow}
        />
        <View style={styles.backdropOrb} />
        <View style={styles.backdropOrbSecondary} />

        <Animated.View style={[styles.content, contentStyle]}>
          <View style={styles.hero}>
            <View style={styles.logoFrame}>
              <Animated.View style={[styles.logoGlow, glowStyle]} />
              <Animated.View style={[styles.logoShell, logoShellStyle]}>
                <BlurView intensity={28} tint="light" style={styles.logoShellInner}>
                  <AppLogo size={76} color={colors.white} />
                </BlurView>
              </Animated.View>
            </View>

            <Text style={styles.brandTitle}>Preparando sua conta</Text>
            <Text style={styles.brandSubtitle}>
              Estamos sincronizando seu ambiente com segurança e preparando as
              informações iniciais.
            </Text>
          </View>

          <BlurView intensity={34} tint="light" style={styles.progressCard}>
            <StatusRail />

            <Animated.View style={[styles.loaderRow, loaderStyle]}>
              <Text style={styles.loaderText}>Entrando no app...</Text>
              <LoadingDots />
            </Animated.View>

            <SurfacePreview />
          </BlurView>
        </Animated.View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0E2F8A",
  },
  background: {
    flex: 1,
    overflow: "hidden",
  },
  topGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  backdropOrb: {
    position: "absolute",
    top: -82,
    right: -38,
    width: 236,
    height: 236,
    borderRadius: 118,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  backdropOrbSecondary: {
    position: "absolute",
    bottom: 112,
    left: -54,
    width: 188,
    height: 188,
    borderRadius: 94,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 28,
  },
  hero: {
    alignItems: "center",
    marginTop: -28,
  },
  logoFrame: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  logoGlow: {
    position: "absolute",
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  logoShell: {
    width: 96,
    height: 96,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.30)",
    backgroundColor: "rgba(255,255,255,0.12)",
    shadowColor: "#0B1F5E",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.14,
    shadowRadius: 38,
    elevation: 10,
  },
  logoShellInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 32,
  },
  brandTitle: {
    fontSize: 31,
    lineHeight: 36,
    color: colors.white,
    letterSpacing: -1.1,
    textAlign: "center",
    fontFamily: "Inter-Bold",
  },
  brandSubtitle: {
    marginTop: 12,
    maxWidth: 324,
    fontSize: 16,
    lineHeight: 23,
    color: "rgba(255,255,255,0.82)",
    textAlign: "center",
    fontFamily: "Inter-Regular",
  },
  progressCard: {
    marginTop: 42,
    borderRadius: 30,
    padding: 18,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.90)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.84)",
    shadowColor: "#94A3B8",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.12,
    shadowRadius: 34,
    elevation: 8,
  },
  statusRail: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
    backgroundColor: "#EAF2FF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  statusText: {
    fontSize: 13,
    color: "#2451B2",
    fontFamily: "Inter-SemiBold",
  },
  loaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
    marginBottom: 18,
  },
  loaderText: {
    fontSize: 15,
    color: colors.text,
    fontFamily: "Inter-SemiBold",
  },
  loadingDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  loadingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  previewCard: {
    backgroundColor: "rgba(255,255,255,0.74)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.9)",
    padding: 16,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  previewTitleStack: {
    flex: 1,
  },
  previewBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7FAFF",
    borderWidth: 1,
    borderColor: "#E5EDF8",
  },
  previewList: {
    marginTop: 18,
    marginBottom: 18,
  },
  metricRow: {
    flexDirection: "row",
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#F7FAFF",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "#E7EEF8",
  },
  mt10: {
    marginTop: 10,
  },
  mt12: {
    marginTop: 12,
  },
});
