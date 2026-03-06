import type { ObraDetalhe } from "@/data/obras";
import type { DiarySection } from "@/hooks/use-diary-state";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

const PRIMARY = "#2563EB";

interface ClientSummaryCardProps {
  obra: ObraDetalhe;
  sections: DiarySection[];
}

export function ClientSummaryCard({ obra, sections }: ClientSummaryCardProps) {
  const totalEntries = sections.reduce((sum, s) => sum + s.entries.length, 0);
  const lastEntry = sections[0]?.entries[0];

  return (
    <View style={styles.clientSummary}>
      <View style={styles.clientSummaryTop}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={styles.clientSummaryLabel}>ACOMPANHAMENTO</Text>
          <Text style={styles.clientSummaryEtapa} numberOfLines={1}>
            {obra.etapaAtual}
          </Text>
        </View>
        <View style={styles.clientProgressBubble}>
          <Text style={styles.clientProgressPct}>{obra.progresso}%</Text>
          <Text style={styles.clientProgressSub}>concluído</Text>
        </View>
      </View>
      <View style={styles.clientProgressTrack}>
        <View
          style={[
            styles.clientProgressFill,
            { width: `${obra.progresso}%` as `${number}%` },
          ]}
        />
      </View>
      <View style={styles.clientSummaryFooter}>
        <MaterialIcons name="history" size={13} color="#9CA3AF" />
        <Text style={styles.clientSummaryMeta}>
          {totalEntries} {totalEntries === 1 ? "registro" : "registros"} no
          diário
        </Text>
        {lastEntry && (
          <>
            <View style={styles.clientMetaDot} />
            <Text style={styles.clientSummaryMeta}>
              Última visita: {lastEntry.date}
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  clientSummary: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  clientSummaryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  clientSummaryLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 1,
    marginBottom: 4,
  },
  clientSummaryEtapa: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.3,
  },
  clientProgressBubble: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#BFDBFE",
  },
  clientProgressPct: {
    fontSize: 15,
    fontWeight: "800",
    color: PRIMARY,
  },
  clientProgressSub: {
    fontSize: 8,
    fontWeight: "600",
    color: PRIMARY,
  },
  clientProgressTrack: {
    height: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 12,
  },
  clientProgressFill: {
    height: "100%",
    backgroundColor: PRIMARY,
    borderRadius: 3,
  },
  clientSummaryFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  clientMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#D1D5DB",
  },
  clientSummaryMeta: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
  },
});
