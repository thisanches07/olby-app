import type { ObraDetalhe } from "@/data/obras";
import { PRIMARY } from "@/utils/obra-utils";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

/** Formata horas decimais como "1h30min", "30min", "2h", etc. */
function formatHoras(h: number): string {
  const total = Math.round(h * 60);
  const hrs = Math.floor(total / 60);
  const mins = total % 60;
  if (hrs === 0) return `${mins}min`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h${mins}min`;
}

interface EngHoursCompactCardProps {
  obra: ObraDetalhe;
  onPress?: () => void;
}

export function EngHoursCompactCard({
  obra,
  onPress,
}: EngHoursCompactCardProps) {
  const horasContratadas = obra.horasContratadas ?? 0;
  const horasRealizadas = obra.horasRealizadas ?? 0;
  const hasHours = horasContratadas > 0;

  const horasRestantes = Math.max(horasContratadas - horasRealizadas, 0);
  const horasPct = hasHours
    ? Math.min(Math.round((horasRealizadas / horasContratadas) * 100), 100)
    : 0;
  const horasBarColor =
    horasPct >= 90 ? "#DC2626" : horasPct >= 75 ? "#D97706" : "#059669";
  const isHorasExcedidas = horasRealizadas > horasContratadas;

  const fillWidth = hasHours
    ? (`${Math.min(horasPct, 100)}%` as `${number}%`)
    : ("100%" as const);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={onPress ? 0.82 : 1}
      disabled={!onPress}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <MaterialIcons name="schedule" size={13} color="#9CA3AF" />
          <Text style={styles.title}>HORAS</Text>
        </View>
        {onPress ? (
          <View style={styles.editChip}>
            <MaterialIcons name="edit" size={11} color={PRIMARY} />
            <Text style={styles.editChipText}>Ajustar</Text>
          </View>
        ) : (
          <View style={styles.lockedChip}>
            <MaterialIcons name="lock" size={11} color="#9CA3AF" />
            <Text style={styles.lockedText}>
              {obra.status === "concluida" ? "Concluída" : "Arquivada"}
            </Text>
          </View>
        )}
      </View>

      {/* Bar */}
      <View style={styles.barRow}>
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              !hasHours && styles.fillNoHours,
              {
                width: fillWidth,
                backgroundColor: hasHours ? horasBarColor : PRIMARY,
              },
            ]}
          />
        </View>
        {hasHours ? (
          <Text style={[styles.barPct, { color: horasBarColor }]}>
            {horasPct}%
          </Text>
        ) : (
          <View style={styles.noHoursBadge}>
            <Text style={styles.noHoursBadgeText}>Sem limite</Text>
          </View>
        )}
      </View>

      {/* Metrics */}
      <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Realizadas</Text>
          <Text
            style={[
              styles.metricValue,
              { color: hasHours ? horasBarColor : PRIMARY },
            ]}
          >
            {formatHoras(horasRealizadas)}
          </Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={[styles.metricItem, { alignItems: "center" }]}>
          <Text style={styles.metricLabel}>
            {isHorasExcedidas ? "Excedidas" : "Disponíveis"}
          </Text>
          <Text
            style={[
              styles.metricValue,
              { color: isHorasExcedidas ? "#EF4444" : hasHours ? "#22C55E" : "#9CA3AF" },
            ]}
          >
            {isHorasExcedidas
              ? `+${formatHoras(horasRealizadas - horasContratadas)}`
              : hasHours
                ? formatHoras(horasRestantes)
                : "—"}
          </Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={[styles.metricItem, { alignItems: "flex-end" }]}>
          <Text style={styles.metricLabel}>Contratadas</Text>
          <Text style={[styles.metricValue, { color: "#374151" }]}>
            {hasHours ? formatHoras(horasContratadas) : "Sem limite"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  title: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 0.8,
  },
  editChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: PRIMARY + "12",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  editChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: PRIMARY,
  },
  lockedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  lockedText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  track: {
    flex: 1,
    height: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 3,
  },
  fillNoHours: {
    opacity: 0.35,
  },
  barPct: {
    fontSize: 12,
    fontWeight: "700",
    minWidth: 36,
    textAlign: "right",
  },
  noHoursBadge: {
    backgroundColor: PRIMARY + "12",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  noHoursBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: PRIMARY,
    letterSpacing: 0.2,
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  metricItem: {
    flex: 1,
  },
  metricDivider: {
    width: 1,
    height: 32,
    backgroundColor: "#F3F4F6",
    marginHorizontal: 12,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#9CA3AF",
    marginBottom: 3,
  },
  metricValue: {
    fontSize: 17,
    fontWeight: "800",
  },
});
