import { Skeleton } from "@/components/ui/skeleton";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import React from "react";
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ProjectDetailLoadingVariant = "cliente" | "responsavel" | "generic";

interface ProjectDetailLoadingScreenProps {
  variant?: ProjectDetailLoadingVariant;
}

function HeaderSkeleton() {
  return (
    <View style={styles.header}>
      <Skeleton width={40} height={40} borderRadius={20} />
      <View style={styles.headerCenter}>
        <Skeleton width={58} height={10} borderRadius={5} />
        <Skeleton width="72%" height={18} borderRadius={7} style={styles.mt6} />
      </View>
      <Skeleton width={40} height={40} borderRadius={20} />
    </View>
  );
}

function DiaryButtonSkeleton() {
  return (
    <View style={styles.diaryButton}>
      <Skeleton width={18} height={18} borderRadius={5} />
      <Skeleton width="58%" height={15} borderRadius={6} style={styles.flex1} />
      <Skeleton width={12} height={12} borderRadius={4} />
    </View>
  );
}

function SectionTitleSkeleton({ width = 92 }: { width?: number }) {
  return (
    <View style={styles.sectionLabelWrap}>
      <Skeleton width={width} height={10} borderRadius={5} />
    </View>
  );
}

function CardSkeleton({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function MetricsCardSkeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <CardSkeleton style={style}>
      <View style={styles.rowBetween}>
        <View style={styles.flex1}>
          <Skeleton width={46} height={10} borderRadius={5} />
        </View>
        <Skeleton width={66} height={24} borderRadius={8} />
      </View>
      <View style={[styles.progressTrack, styles.mt14]}>
        <Skeleton width="72%" height={6} borderRadius={3} />
      </View>
      <View style={[styles.metricsRow, styles.mt14]}>
        <View style={styles.metricCol}>
          <Skeleton width={54} height={10} borderRadius={5} />
          <Skeleton width={68} height={18} borderRadius={6} style={styles.mt6} />
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricColCenter}>
          <Skeleton width={48} height={10} borderRadius={5} />
          <Skeleton width={60} height={18} borderRadius={6} style={styles.mt6} />
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricColRight}>
          <Skeleton width={70} height={10} borderRadius={5} />
          <Skeleton width={82} height={18} borderRadius={6} style={styles.mt6} />
        </View>
      </View>
    </CardSkeleton>
  );
}

function EngineerOverviewSkeleton() {
  return (
    <>
      <CardSkeleton style={styles.heroCard}>
        <Skeleton width={110} height={110} borderRadius={55} />
        <View style={styles.heroInfo}>
          <View style={styles.rowBetween}>
            <Skeleton width={116} height={26} borderRadius={13} />
            <Skeleton width={38} height={38} borderRadius={14} />
          </View>
          <Skeleton width="76%" height={12} borderRadius={6} style={styles.mt12} />
          <Skeleton width="62%" height={12} borderRadius={6} style={styles.mt8} />
        </View>
      </CardSkeleton>

      <DiaryButtonSkeleton />
      <MetricsCardSkeleton />
      <MetricsCardSkeleton style={styles.mb20} />

      <View style={styles.sectionHeader}>
        <Skeleton width={84} height={22} borderRadius={7} />
        <View style={styles.sectionHeaderRight}>
          <Skeleton width={76} height={26} borderRadius={8} />
          <Skeleton width={58} height={14} borderRadius={6} />
        </View>
      </View>

      <View style={styles.progressBlock}>
        <View style={styles.rowBetween}>
          <Skeleton width={118} height={12} borderRadius={6} />
          <Skeleton width={34} height={12} borderRadius={6} />
        </View>
        <View style={[styles.progressTrack, styles.mt8]}>
          <Skeleton width="58%" height={4} borderRadius={2} />
        </View>
      </View>

      <TaskCardSkeleton />
      <TaskCardSkeleton />
    </>
  );
}

function ClientOverviewSkeleton() {
  return (
    <>
      <View style={styles.clientTopBlock}>
        <View style={styles.clientTopInner}>
          <Skeleton width={92} height={24} borderRadius={12} />
          <Skeleton width="88%" height={13} borderRadius={6} style={styles.mt12} />

          <View style={[styles.clientMetricsStrip, styles.mt16]}>
            <View style={styles.metricColCenter}>
              <Skeleton width={58} height={18} borderRadius={6} />
              <Skeleton width={54} height={10} borderRadius={5} style={styles.mt6} />
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricColCenter}>
              <Skeleton width={68} height={18} borderRadius={6} />
              <Skeleton width={50} height={10} borderRadius={5} style={styles.mt6} />
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricColCenter}>
              <Skeleton width={64} height={18} borderRadius={6} />
              <Skeleton width={62} height={10} borderRadius={5} style={styles.mt6} />
            </View>
          </View>

          <View style={[styles.progressTrack, styles.mt14]}>
            <Skeleton width="64%" height={5} borderRadius={3} />
          </View>
          <Skeleton width="44%" height={12} borderRadius={6} style={styles.mt10} />
        </View>
      </View>

      <DiaryButtonSkeleton />

      <SectionTitleSkeleton width={126} />
      <CardSkeleton>
        <View style={styles.rowBetween}>
          <View>
            <Skeleton width={110} height={38} borderRadius={10} />
            <Skeleton width={92} height={12} borderRadius={6} style={styles.mt8} />
          </View>
          <Skeleton width={68} height={48} borderRadius={12} />
        </View>
        <View style={[styles.progressTrack, styles.mt14]}>
          <Skeleton width="72%" height={6} borderRadius={3} />
        </View>
        <Skeleton width="70%" height={12} borderRadius={6} style={styles.mt10} />
      </CardSkeleton>

      <SectionTitleSkeleton width={128} />
      <CardSkeleton>
        <View style={styles.rowBetween}>
          <View>
            <Skeleton width={74} height={22} borderRadius={7} />
            <Skeleton width={96} height={12} borderRadius={6} style={styles.mt8} />
          </View>
          <View style={styles.clientDotsRow}>
            <Skeleton width={10} height={10} borderRadius={5} />
            <Skeleton width={10} height={10} borderRadius={5} />
            <Skeleton width={10} height={10} borderRadius={5} />
            <Skeleton width={10} height={10} borderRadius={5} />
          </View>
        </View>
        <View style={styles.divider} />
        <TimelineSkeletonItem />
        <TimelineSkeletonItem />
      </CardSkeleton>

      <SectionTitleSkeleton width={86} />
      <MetricsCardSkeleton />

      <SectionTitleSkeleton width={70} />
      <CardSkeleton>
        <View style={styles.rowBetween}>
          <Skeleton width={98} height={16} borderRadius={6} />
          <Skeleton width={76} height={12} borderRadius={6} />
        </View>
        <View style={[styles.galleryRow, styles.mt14]}>
          <Skeleton width="31%" height={92} borderRadius={14} />
          <Skeleton width="31%" height={92} borderRadius={14} />
          <Skeleton width="31%" height={92} borderRadius={14} />
        </View>
      </CardSkeleton>
    </>
  );
}

function GenericOverviewSkeleton() {
  return (
    <>
      <CardSkeleton style={styles.heroCard}>
        <Skeleton width={96} height={96} borderRadius={48} />
        <View style={styles.heroInfo}>
          <Skeleton width={120} height={26} borderRadius={13} />
          <Skeleton width="78%" height={12} borderRadius={6} style={styles.mt12} />
          <Skeleton width="56%" height={12} borderRadius={6} style={styles.mt8} />
        </View>
      </CardSkeleton>

      <DiaryButtonSkeleton />
      <MetricsCardSkeleton />
      <MetricsCardSkeleton />
      <TaskCardSkeleton />
      <TaskCardSkeleton />
    </>
  );
}

function TaskCardSkeleton() {
  return (
    <View style={styles.taskCard}>
      <Skeleton width={24} height={24} borderRadius={6} />
      <View style={styles.flex1}>
        <Skeleton width="72%" height={15} borderRadius={5} />
        <Skeleton width="46%" height={11} borderRadius={4} style={styles.mt6} />
      </View>
      <Skeleton width={42} height={22} borderRadius={6} />
    </View>
  );
}

function TimelineSkeletonItem() {
  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineCol}>
        <Skeleton width={22} height={22} borderRadius={11} />
        <Skeleton width={2} height={26} borderRadius={1} style={styles.mt4} />
      </View>
      <View style={styles.flex1}>
        <Skeleton width="54%" height={14} borderRadius={6} />
        <Skeleton width={90} height={20} borderRadius={6} style={styles.mt8} />
        <Skeleton width="78%" height={12} borderRadius={6} style={styles.mt8} />
      </View>
    </View>
  );
}

function BottomBarSkeleton() {
  return (
    <View style={styles.bottomArea}>
      <View style={styles.bottomTabs}>
        <View style={styles.bottomTabItem}>
          <Skeleton width={22} height={22} borderRadius={11} />
          <Skeleton width={48} height={10} borderRadius={5} style={styles.mt6} />
        </View>
        <View style={styles.bottomTabItem}>
          <Skeleton width={22} height={22} borderRadius={11} />
          <Skeleton width={48} height={10} borderRadius={5} style={styles.mt6} />
        </View>
        <View style={styles.bottomTabItem}>
          <Skeleton width={22} height={22} borderRadius={11} />
          <Skeleton width={48} height={10} borderRadius={5} style={styles.mt6} />
        </View>
      </View>
    </View>
  );
}

export function ProjectDetailLoadingScreen({
  variant = "generic",
}: ProjectDetailLoadingScreenProps) {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <HeaderSkeleton />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {variant === "cliente" ? <ClientOverviewSkeleton /> : null}
        {variant === "responsavel" ? <EngineerOverviewSkeleton /> : null}
        {variant === "generic" ? <GenericOverviewSkeleton /> : null}
      </ScrollView>
      <BottomBarSkeleton />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  scroll: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  content: {
    paddingHorizontal: spacing[16],
    paddingBottom: 120,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 13,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.12)",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: spacing[12],
  },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[16],
    marginTop: spacing[8],
  },
  heroInfo: {
    flex: 1,
  },
  diaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    backgroundColor: colors.tintBlue,
    borderRadius: radius.md,
    paddingVertical: spacing[14],
    paddingHorizontal: spacing[16],
    marginTop: spacing[14],
    marginBottom: spacing[8],
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  clientTopBlock: {
    backgroundColor: colors.white,
    marginHorizontal: -spacing[16],
    paddingBottom: spacing[10],
    borderBottomWidth: 1,
    borderBottomColor: colors.dividerSoft,
  },
  clientTopInner: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  clientMetricsStrip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing[4],
    marginBottom: spacing[12],
  },
  sectionHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[10],
  },
  sectionLabelWrap: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
  },
  progressBlock: {
    marginBottom: 14,
  },
  progressTrack: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  metricCol: {
    flex: 1,
    alignItems: "flex-start",
  },
  metricColCenter: {
    flex: 1,
    alignItems: "center",
  },
  metricColRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  metricDivider: {
    width: 1,
    height: 32,
    backgroundColor: "#F3F4F6",
    marginHorizontal: 12,
  },
  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  timelineCol: {
    width: 28,
    alignItems: "center",
    marginRight: 10,
  },
  clientDotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 12,
  },
  galleryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  bottomArea: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.dividerSoft,
    shadowColor: colors.black,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -6 },
    elevation: 12,
  },
  bottomTabs: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: spacing[16],
    paddingTop: spacing[12],
    paddingBottom: spacing[24],
  },
  bottomTabItem: {
    alignItems: "center",
  },
  flex1: {
    flex: 1,
  },
  mt4: {
    marginTop: 4,
  },
  mt6: {
    marginTop: 6,
  },
  mt8: {
    marginTop: 8,
  },
  mt10: {
    marginTop: 10,
  },
  mt12: {
    marginTop: 12,
  },
  mt14: {
    marginTop: 14,
  },
  mt16: {
    marginTop: 16,
  },
  mb20: {
    marginBottom: 20,
  },
});
