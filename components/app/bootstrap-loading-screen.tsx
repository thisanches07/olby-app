import { Skeleton } from "@/components/ui/skeleton";
import { colors } from "@/theme/colors";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function StatSkeleton() {
  return (
    <View style={styles.statCard}>
      <Skeleton width={40} height={22} borderRadius={7} />
      <Skeleton width={64} height={10} borderRadius={5} style={styles.mt8} />
    </View>
  );
}

function ProjectHighlightSkeleton() {
  return (
    <View style={styles.highlightCard}>
      <View style={styles.highlightTop}>
        <View style={styles.highlightLeft}>
          <Skeleton width={92} height={24} borderRadius={999} />
          <Skeleton width="82%" height={20} borderRadius={7} style={styles.mt12} />
          <Skeleton width="58%" height={12} borderRadius={6} style={styles.mt8} />
        </View>
        <Skeleton width={48} height={48} borderRadius={16} />
      </View>

      <View style={styles.progressWrap}>
        <View style={styles.progressHeader}>
          <Skeleton width={86} height={11} borderRadius={5} />
          <Skeleton width={28} height={11} borderRadius={5} />
        </View>
        <View style={styles.progressTrack}>
          <Skeleton width="68%" height={6} borderRadius={999} />
        </View>
      </View>

      <View style={styles.highlightFooter}>
        <Skeleton width={104} height={11} borderRadius={5} />
        <Skeleton width={96} height={11} borderRadius={5} />
      </View>
    </View>
  );
}

function ProjectListCardSkeleton() {
  return (
    <View style={styles.projectCard}>
      <View style={styles.cardTop}>
        <Skeleton width={78} height={22} borderRadius={999} />
        <Skeleton width={18} height={18} borderRadius={6} />
      </View>
      <Skeleton width="74%" height={17} borderRadius={7} style={styles.mt12} />
      <Skeleton width="52%" height={12} borderRadius={6} style={styles.mt8} />
      <Skeleton width="66%" height={12} borderRadius={6} style={styles.mt8} />

      <View style={styles.cardDivider} />

      <View style={styles.progressHeader}>
        <Skeleton width={70} height={11} borderRadius={5} />
        <Skeleton width={26} height={11} borderRadius={5} />
      </View>
      <View style={styles.progressTrack}>
        <Skeleton width="54%" height={6} borderRadius={999} />
      </View>

      <View style={styles.cardFooter}>
        <Skeleton width={92} height={11} borderRadius={5} />
        <Skeleton width={88} height={11} borderRadius={5} />
      </View>
    </View>
  );
}

export function BootstrapLoadingScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <LinearGradient
        colors={["#0F3FBF", "#2563EB", "#5EA2FF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.orbPrimary} />
        <View style={styles.orbSecondary} />

        <View style={styles.heroTop}>
          <View>
            <Text style={styles.eyebrow}>Preparando sua area</Text>
            <Text style={styles.title}>Obly</Text>
          </View>
          <View style={styles.brandMark}>
            <View style={styles.brandMarkInner} />
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatSkeleton />
          <View style={styles.statDivider} />
          <StatSkeleton />
          <View style={styles.statDivider} />
          <StatSkeleton />
        </View>
      </LinearGradient>

      <View style={styles.body}>
        <View style={styles.searchShell}>
          <Skeleton width={18} height={18} borderRadius={9} />
          <Skeleton width="52%" height={13} borderRadius={6} style={styles.flex1} />
          <Skeleton width={18} height={18} borderRadius={9} />
        </View>

        <View style={styles.chipsRow}>
          <Skeleton width={68} height={32} borderRadius={999} />
          <Skeleton width={118} height={32} borderRadius={999} />
          <Skeleton width={102} height={32} borderRadius={999} />
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>VISÃO GERAL</Text>
            <Text style={styles.sectionTitle}>Seus projetos estão chegando</Text>
          </View>
          <Skeleton width={40} height={40} borderRadius={20} />
        </View>

        <ProjectHighlightSkeleton />

        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Projetos recentes</Text>
          <Skeleton width={54} height={12} borderRadius={6} />
        </View>

        <ProjectListCardSkeleton />
        <ProjectListCardSkeleton />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 26,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: "hidden",
  },
  orbPrimary: {
    position: "absolute",
    top: -40,
    right: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  orbSecondary: {
    position: "absolute",
    bottom: -56,
    left: -18,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22,
  },
  eyebrow: {
    fontSize: 13,
    color: "rgba(255,255,255,0.78)",
    fontFamily: "Inter-SemiBold",
  },
  title: {
    marginTop: 4,
    fontSize: 32,
    lineHeight: 36,
    color: colors.white,
    letterSpacing: -0.8,
    fontFamily: "Inter-Bold",
  },
  brandMark: {
    width: 48,
    height: 48,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  brandMarkInner: {
    width: 22,
    height: 22,
    borderRadius: 8,
    backgroundColor: colors.white,
    opacity: 0.92,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    height: 34,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  searchShell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 4,
  },
  chipsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionEyebrow: {
    fontSize: 11,
    color: "#64748B",
    letterSpacing: 1.3,
    fontFamily: "Inter-Bold",
  },
  sectionTitle: {
    marginTop: 5,
    fontSize: 20,
    color: "#0F172A",
    letterSpacing: -0.4,
    fontFamily: "Inter-Bold",
  },
  highlightCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 5,
  },
  highlightTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
  },
  highlightLeft: {
    flex: 1,
  },
  progressWrap: {
    marginTop: 18,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#E8EEF8",
    overflow: "hidden",
  },
  highlightFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 17,
    color: "#111827",
    letterSpacing: -0.3,
    fontFamily: "Inter-Bold",
  },
  projectCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 3,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#EEF2F7",
    marginVertical: 14,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
  },
  flex1: {
    flex: 1,
  },
  mt8: {
    marginTop: 8,
  },
  mt12: {
    marginTop: 12,
  },
});
