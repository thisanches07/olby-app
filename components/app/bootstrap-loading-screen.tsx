import { Skeleton } from "@/components/ui/skeleton";
import { colors } from "@/theme/colors";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function StatusRail() {
  return (
    <View style={styles.statusRail}>
      <View style={styles.statusDot} />
      <Text style={styles.statusText}>Validando sua sessão</Text>
    </View>
  );
}

function SurfacePreview() {
  return (
    <View style={styles.previewCard}>
      <View style={styles.previewHeader}>
        <View>
          <Skeleton width={88} height={12} borderRadius={6} />
          <Skeleton width={146} height={24} borderRadius={8} style={styles.mt10} />
        </View>
        <Skeleton width={48} height={48} borderRadius={16} />
      </View>

      <View style={styles.previewDivider} />

      <View style={styles.previewSection}>
        <Skeleton width="72%" height={14} borderRadius={7} />
        <Skeleton width="100%" height={12} borderRadius={6} style={styles.mt12} />
        <Skeleton width="84%" height={12} borderRadius={6} style={styles.mt10} />
      </View>

      <View style={styles.metricRow}>
        <View style={styles.metricCard}>
          <Skeleton width={52} height={20} borderRadius={8} />
          <Skeleton width={78} height={11} borderRadius={6} style={styles.mt10} />
        </View>
        <View style={styles.metricCard}>
          <Skeleton width={44} height={20} borderRadius={8} />
          <Skeleton width={66} height={11} borderRadius={6} style={styles.mt10} />
        </View>
      </View>
    </View>
  );
}

export function BootstrapLoadingScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <LinearGradient
        colors={["#0E2F8A", "#2563EB", "#7DB7FF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.background}
      >
        <View style={styles.orbLarge} />
        <View style={styles.orbSmall} />
        <View style={styles.orbGlow} />

        <View style={styles.content}>
          <View style={styles.brandWrap}>
            <View style={styles.brandBadge}>
              <View style={styles.brandBadgeInner} />
            </View>
            <Text style={styles.brandEyebrow}>OBLY</Text>
            <Text style={styles.brandTitle}>Preparando sua conta</Text>
            <Text style={styles.brandSubtitle}>
              Estamos carregando seu ambiente com seguranca e sincronizando as
              informacoes iniciais.
            </Text>
          </View>

          <View style={styles.progressCard}>
            <StatusRail />

            <View style={styles.loaderRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loaderText}>Entrando no app...</Text>
            </View>

            <SurfacePreview />
          </View>
        </View>
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
  orbLarge: {
    position: "absolute",
    top: -120,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(255,255,255,0.09)",
  },
  orbSmall: {
    position: "absolute",
    bottom: 160,
    left: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  orbGlow: {
    position: "absolute",
    bottom: -70,
    right: 30,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 28,
  },
  brandWrap: {
    alignItems: "center",
    paddingTop: 12,
  },
  brandBadge: {
    width: 74,
    height: 74,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  brandBadgeInner: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.white,
    opacity: 0.94,
  },
  brandEyebrow: {
    fontSize: 12,
    letterSpacing: 2.4,
    color: "rgba(255,255,255,0.72)",
    fontFamily: "Inter-Bold",
    marginBottom: 10,
  },
  brandTitle: {
    fontSize: 30,
    lineHeight: 34,
    color: colors.white,
    letterSpacing: -0.9,
    textAlign: "center",
    fontFamily: "Inter-Bold",
  },
  brandSubtitle: {
    marginTop: 12,
    maxWidth: 320,
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(255,255,255,0.78)",
    textAlign: "center",
    fontFamily: "Inter-Regular",
  },
  progressCard: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 28,
    padding: 18,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.16,
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
    paddingVertical: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  statusText: {
    fontSize: 12,
    color: "#1746B0",
    fontFamily: "Inter-SemiBold",
  },
  loaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
    marginBottom: 18,
  },
  loaderText: {
    fontSize: 15,
    color: colors.text,
    fontFamily: "Inter-SemiBold",
  },
  previewCard: {
    backgroundColor: colors.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E7EEF8",
    padding: 16,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },
  previewDivider: {
    height: 1,
    backgroundColor: "#EEF2F7",
    marginVertical: 16,
  },
  previewSection: {
    marginBottom: 16,
  },
  metricRow: {
    flexDirection: "row",
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  mt10: {
    marginTop: 10,
  },
  mt12: {
    marginTop: 12,
  },
});
