import { CircularProgress } from "@/components/obra/circular-progress";
import type { ObraDetalhe } from "@/data/obras";
import type { DiarySection } from "@/hooks/use-diary-state";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
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
    <View style={styles.card}>
      {/* Top row: info + ring */}
      <View style={styles.topRow}>
        <View style={styles.topLeft}>
          <View style={styles.labelRow}>
            <View style={styles.labelDot} />
            <Text style={styles.label}>ACOMPANHAMENTO</Text>
          </View>
          <Text style={styles.etapa} numberOfLines={2}>
            {obra.etapaAtual}
          </Text>
        </View>

        <CircularProgress
          value={obra.progresso}
          size={72}
          strokeWidth={6}
          color={PRIMARY}
          trackColor="#E8ECFF"
          label="CONCLUSÃO"
        />
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <LinearGradient
          colors={["#3B82F6", "#2563EB"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.progressFill,
            { width: `${obra.progresso}%` as `${number}%` },
          ]}
        />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <MaterialIcons name="history" size={13} color="#9CA3AF" />
        <Text style={styles.meta}>
          {totalEntries} {totalEntries === 1 ? "registro" : "registros"} no diário
        </Text>
        {lastEntry && (
          <>
            <View style={styles.metaDot} />
            <Text style={styles.meta}>Última visita: {lastEntry.date}</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#F0F4FB",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },

  // ── Top row ───────────────────────────────────────────
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  topLeft: {
    flex: 1,
    marginRight: 14,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 6,
  },
  labelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: PRIMARY,
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 1,
  },
  etapa: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.4,
    lineHeight: 24,
  },

  // ── Progress bar ──────────────────────────────────────
  progressTrack: {
    height: 7,
    backgroundColor: "#EEF0F6",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 14,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },

  // ── Footer ────────────────────────────────────────────
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#D1D5DB",
  },
  meta: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
  },
});
