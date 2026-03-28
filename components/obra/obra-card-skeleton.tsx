import React from "react";
import { StyleSheet, View } from "react-native";

import { Skeleton } from "@/components/ui/skeleton";
import { colors } from "@/theme/colors";

export function ObraCardSkeleton() {
  return (
    <View style={styles.card}>
      {/* Header row: badge + chevron */}
      <View style={styles.row}>
        <Skeleton width={100} height={24} borderRadius={20} />
        <Skeleton width={22} height={22} borderRadius={4} />
      </View>

      {/* Nome do projeto */}
      <Skeleton width="80%" height={18} borderRadius={6} style={styles.mt10} />

      {/* Cliente */}
      <Skeleton width="55%" height={14} borderRadius={6} style={styles.mt6} />

      {/* Endereço */}
      <Skeleton width="70%" height={12} borderRadius={6} style={styles.mt6} />

      <View style={styles.divider} />

      {/* Progress */}
      <View style={styles.progressHeader}>
        <Skeleton width={60} height={12} borderRadius={4} />
        <Skeleton width={30} height={12} borderRadius={4} />
      </View>
      <Skeleton width="100%" height={6} borderRadius={3} style={styles.mt6} />

      {/* Footer dates */}
      <View style={[styles.row, styles.mt12]}>
        <Skeleton width={110} height={11} borderRadius={4} />
        <Skeleton width={110} height={11} borderRadius={4} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray100,
    marginVertical: 12,
  },
  mt6: { marginTop: 6 },
  mt10: { marginTop: 10 },
  mt12: { marginTop: 12 },
});
