import { Skeleton } from "@/components/ui/skeleton";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { shadow } from "@/theme/shadows";
import { spacing } from "@/theme/spacing";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type DiaryLoadingVariant = "cliente" | "engenheiro";

interface DiaryLoadingScreenProps {
  variant: DiaryLoadingVariant;
}

function HeaderSkeleton() {
  return (
    <View style={styles.header}>
      <Skeleton width={40} height={40} borderRadius={20} />
      <View style={styles.headerCenter}>
        <Skeleton width={92} height={10} borderRadius={5} />
        <Skeleton width="66%" height={18} borderRadius={7} style={styles.mt6} />
      </View>
      <View style={styles.headerSpacer} />
    </View>
  );
}

function TabsSkeleton() {
  return (
    <View style={styles.tabsWrap}>
      <View style={styles.segmented}>
        <View style={styles.segmentActive}>
          <Skeleton width={96} height={14} borderRadius={7} />
        </View>
        <View style={styles.segmentIdle}>
          <Skeleton width={42} height={14} borderRadius={7} />
        </View>
      </View>
      <View style={styles.bottomDivider} />
    </View>
  );
}

function ActionsSkeleton() {
  return (
    <View style={styles.actionsWrap}>
      <View style={styles.primaryAction}>
        <Skeleton width={18} height={18} borderRadius={9} />
        <Skeleton width={108} height={15} borderRadius={7} />
      </View>
      <View style={styles.actionsDivider} />
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

function ClientSummarySkeleton() {
  return (
    <CardSkeleton style={styles.summaryCard}>
      <View style={styles.summaryTop}>
        <View style={styles.flex1}>
          <Skeleton width={104} height={10} borderRadius={5} />
          <Skeleton width="72%" height={18} borderRadius={7} style={styles.mt8} />
        </View>
        <Skeleton width={60} height={60} borderRadius={30} />
      </View>
      <View style={styles.progressTrack}>
        <Skeleton width="62%" height={6} borderRadius={3} />
      </View>
      <View style={[styles.row, styles.mt12]}>
        <Skeleton width={14} height={14} borderRadius={7} />
        <Skeleton width={126} height={12} borderRadius={6} />
        <Skeleton width={4} height={4} borderRadius={2} />
        <Skeleton width={98} height={12} borderRadius={6} />
      </View>
    </CardSkeleton>
  );
}

function ClientEntrySkeleton() {
  return (
    <View style={styles.clientEntryWrap}>
      <Skeleton width={96} height={10} borderRadius={5} style={styles.mb12} />
      <CardSkeleton>
        <View style={styles.rowBetweenStart}>
          <View style={styles.flex1}>
            <Skeleton width="52%" height={12} borderRadius={6} />
            <Skeleton width="74%" height={20} borderRadius={8} style={styles.mt10} />
          </View>
          <Skeleton width={72} height={28} borderRadius={14} />
        </View>
        <View style={[styles.photoRow, styles.mt14]}>
          <Skeleton width={96} height={112} borderRadius={14} />
          <Skeleton width={96} height={112} borderRadius={14} />
          <Skeleton width={96} height={112} borderRadius={14} />
        </View>
        <Skeleton width="92%" height={13} borderRadius={6} style={styles.mt14} />
        <Skeleton width="66%" height={13} borderRadius={6} style={styles.mt8} />
      </CardSkeleton>
    </View>
  );
}

function EngineerEntrySkeleton() {
  return (
    <View style={styles.engineerEntryWrap}>
      <Skeleton width={96} height={10} borderRadius={5} style={styles.mb16} />
      <View style={styles.rowBetweenCenter}>
        <View style={styles.row}>
          <Skeleton width={8} height={8} borderRadius={4} />
          <Skeleton width={110} height={12} borderRadius={6} />
          <Skeleton width={78} height={28} borderRadius={14} />
        </View>
        <Skeleton width={34} height={22} borderRadius={8} />
      </View>
      <Skeleton width="68%" height={24} borderRadius={8} style={styles.mt12} />
      <View style={[styles.photoRow, styles.mt14]}>
        <Skeleton width={170} height={210} borderRadius={14} />
        <Skeleton width={170} height={210} borderRadius={14} />
      </View>
      <Skeleton width="94%" height={13} borderRadius={6} style={styles.mt14} />
      <Skeleton width="72%" height={13} borderRadius={6} style={styles.mt8} />
      <View style={styles.entryDivider} />
    </View>
  );
}

function ClientDiaryLoading() {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <ClientSummarySkeleton />
      <ClientEntrySkeleton />
      <ClientEntrySkeleton />
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

function EngineerDiaryLoading() {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.scrollContent, styles.engineerContent]}
      showsVerticalScrollIndicator={false}
    >
      <EngineerEntrySkeleton />
      <EngineerEntrySkeleton />
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

export function DiaryLoadingScreen({ variant }: DiaryLoadingScreenProps) {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.stickyHeader}>
        <HeaderSkeleton />
        <TabsSkeleton />
        {variant === "engenheiro" ? <ActionsSkeleton /> : null}
      </View>

      {variant === "cliente" ? <ClientDiaryLoading /> : <EngineerDiaryLoading />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  stickyHeader: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.dividerSoft,
    ...shadow(2, colors.black),
    zIndex: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: spacing[8],
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  tabsWrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: colors.white,
  },
  segmented: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  segmentActive: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  segmentIdle: {
    flex: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  bottomDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
    marginTop: 10,
  },
  actionsWrap: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[10],
    backgroundColor: colors.white,
  },
  primaryAction: {
    height: spacing[44],
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[8],
    ...shadow(2, colors.primary),
  },
  actionsDivider: {
    height: 1,
    backgroundColor: colors.dividerSoft,
    marginTop: spacing[12],
  },
  scroll: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  engineerContent: {
    paddingTop: 8,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryCard: {
    marginBottom: 20,
  },
  summaryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
    gap: 12,
  },
  progressTrack: {
    height: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 3,
    overflow: "hidden",
  },
  clientEntryWrap: {
    marginBottom: 20,
  },
  engineerEntryWrap: {
    marginTop: 12,
  },
  photoRow: {
    flexDirection: "row",
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rowBetweenStart: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  rowBetweenCenter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  entryDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 20,
  },
  flex1: {
    flex: 1,
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
  mb12: {
    marginBottom: 12,
  },
  mb16: {
    marginBottom: 16,
  },
  bottomSpacer: {
    height: 16,
  },
});
