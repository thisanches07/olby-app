import type { ObraDetalhe } from "@/data/obras";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

const PRIMARY = "#2563EB";

interface HomeClienteStatsProps {
  obras: ObraDetalhe[];
}

export function HomeClienteStats({ obras }: HomeClienteStatsProps) {
  const total = obras.length;
  const emAndamento = obras.filter((o) => o.status === "em_andamento").length;
  const concluidas = obras.filter((o) => o.status === "concluida").length;

  return (
    <View style={styles.statsRow}>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{total}</Text>
        <Text style={styles.statLabel}>Total</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{emAndamento}</Text>
        <Text style={styles.statLabel}>Em Andamento</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{concluidas}</Text>
        <Text style={styles.statLabel}>Concluídas</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  statLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginVertical: 4,
  },
});
